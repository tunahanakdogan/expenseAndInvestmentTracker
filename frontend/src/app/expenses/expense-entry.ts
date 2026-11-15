import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { parseAmount } from '../shared/amount-input';
import { Account, AccountApi } from '../settings/account-api';
import { Category, CategoryApi } from '../settings/category-api';
import { amountValidator, apiErrorMessage } from './amount-validator';
import { ExpenseApi } from './expense-api';
import { toIsoDate } from './period';

export const LAST_ACCOUNT_KEY = 'finans.lastAccountId';

const CURRENCY_SYMBOLS: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };

/**
 * Hızlı harcama girişi (bottom sheet). Mutlu yol üç dokunuş: tutar → kategori → Kaydet;
 * hesap, taksit ve tarih varsayılanlıdır. Kaydedince true ile kapanır.
 */
@Component({
  selector: 'app-expense-entry',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatChipsModule, MatFormFieldModule, MatInputModule],
  template: `
    @if (loadFailed()) {
      <p>Hesaplar ve kategoriler yüklenemedi</p>
      <button matButton (click)="load()">Tekrar dene</button>
    } @else if (accounts(); as accountList) {
      @if (accountList.length === 0) {
        <p>
          Önce Ayarlar'dan bir hesap ekle.
          <a routerLink="/ayarlar" (click)="sheetRef.dismiss()">Ayarlar'a git</a>
        </p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field class="amount">
            <mat-label>Tutar</mat-label>
            <input #amountInput matInput inputmode="decimal" formControlName="amount" autocomplete="off" />
            <span matTextSuffix>{{ currencySymbol() }}</span>
            @if (form.controls.amount.hasError('required')) {
              <mat-error>Tutar gerekli</mat-error>
            } @else if (form.controls.amount.hasError('amount')) {
              <mat-error>Geçerli bir tutar gir</mat-error>
            }
          </mat-form-field>

          <mat-chip-listbox formControlName="categoryId" aria-label="Kategori">
            @for (category of categories(); track category.id) {
              <mat-chip-option [value]="category.id">{{ category.name }}</mat-chip-option>
            }
          </mat-chip-listbox>
          @if (submitted() && form.controls.categoryId.invalid) {
            <p class="error">Kategori seç</p>
          }

          <div class="row">
            <mat-form-field>
              <mat-label>Hesap</mat-label>
              <select matNativeControl formControlName="accountId">
                @for (account of accountList; track account.id) {
                  <option [value]="account.id">{{ account.name }}</option>
                }
              </select>
            </mat-form-field>
            @if (selectedAccount()?.type === 'CREDIT_CARD') {
              <mat-form-field class="installments">
                <mat-label>Taksit</mat-label>
                <select matNativeControl formControlName="installmentCount">
                  @for (count of installmentOptions; track count) {
                    <option [value]="count">{{ count }}</option>
                  }
                </select>
              </mat-form-field>
            }
          </div>

          <mat-form-field>
            <mat-label>Tarih</mat-label>
            <input matInput type="date" formControlName="date" />
            @if (form.controls.date.invalid) {
              <mat-error>Tarih gerekli</mat-error>
            }
          </mat-form-field>
          <mat-form-field>
            <mat-label>Açıklama (opsiyonel)</mat-label>
            <input matInput formControlName="description" maxlength="200" autocomplete="off" />
          </mat-form-field>

          @if (error(); as message) {
            <p class="error" role="alert">{{ message }}</p>
          }
          <button matButton="filled" type="submit" [disabled]="saving()">
            {{ saving() ? 'Kaydediliyor…' : 'Kaydet' }}
          </button>
        </form>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      padding: 16px 0 calc(16px + env(safe-area-inset-bottom));
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .amount input {
      font: var(--mat-sys-headline-small);
    }
    mat-chip-listbox {
      margin-bottom: 12px;
    }
    .row {
      display: flex;
      gap: 8px;
    }
    .row mat-form-field {
      flex: 1;
      min-width: 0;
    }
    .row .installments {
      flex: 0 0 96px;
    }
    button[type='submit'] {
      height: 48px;
    }
    .error {
      color: var(--mat-sys-error);
      margin: 0 0 8px;
    }
  `,
})
export class ExpenseEntry {
  private readonly accountApi = inject(AccountApi);
  private readonly categoryApi = inject(CategoryApi);
  private readonly expenseApi = inject(ExpenseApi);
  protected readonly sheetRef = inject<MatBottomSheetRef<ExpenseEntry, boolean>>(MatBottomSheetRef);

  protected readonly installmentOptions = Array.from({ length: 36 }, (_, i) => i + 1);
  protected readonly accounts = signal<Account[] | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly loadFailed = signal(false);
  protected readonly selectedAccount = signal<Account | null>(null);
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly fb = inject(NonNullableFormBuilder);
  // Select değerleri DOM'dan string gelir; id ve taksit sayısı gönderirken sayıya çevrilir (para değil).
  protected readonly form = this.fb.group({
    amount: ['', [Validators.required, amountValidator]],
    categoryId: this.fb.control<number | null>(null, Validators.required),
    accountId: [''],
    installmentCount: ['1'],
    date: [toIsoDate(new Date()), Validators.required],
    description: ['', Validators.maxLength(200)],
  });

  private readonly amountInput = viewChild<ElementRef<HTMLInputElement>>('amountInput');

  constructor() {
    // Form veriler gelince çizilir; tutar alanı göründüğü anda odaklanır (klavye hemen açılsın).
    effect(() => this.amountInput()?.nativeElement.focus());
    this.form.controls.accountId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.onAccountChange(id));
    this.load();
  }

  protected load(): void {
    this.loadFailed.set(false);
    forkJoin([this.accountApi.list(), this.categoryApi.list()]).subscribe({
      next: ([accounts, categories]) => {
        this.categories.set(categories);
        this.accounts.set(accounts);
        if (accounts.length > 0) {
          // Son kullanılan hesap; silinmişse (ya da ilk kullanımda) ilk hesap.
          const last = localStorage.getItem(LAST_ACCOUNT_KEY);
          const initial = accounts.find((a) => String(a.id) === last) ?? accounts[0];
          this.form.controls.accountId.setValue(String(initial.id));
        }
      },
      error: () => this.loadFailed.set(true),
    });
  }

  protected currencySymbol(): string {
    const currency = this.selectedAccount()?.currency ?? '';
    return CURRENCY_SYMBOLS[currency] ?? currency;
  }

  private onAccountChange(id: string): void {
    const account = this.accounts()?.find((a) => String(a.id) === id) ?? null;
    this.selectedAccount.set(account);
    if (account?.type !== 'CREDIT_CARD') {
      // Taksit yalnız kredi kartında; alan gizlenince eski seçim gönderilmesin.
      this.form.controls.installmentCount.setValue('1');
    }
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.saving()) {
      return;
    }
    const raw = this.form.getRawValue();
    const description = raw.description.trim();
    this.saving.set(true);
    this.error.set(null);
    this.expenseApi
      .create({
        accountId: Number(raw.accountId),
        categoryId: raw.categoryId!,
        amount: parseAmount(raw.amount)!,
        date: raw.date,
        installmentCount: Number(raw.installmentCount),
        description: description === '' ? null : description,
      })
      .subscribe({
        next: () => {
          localStorage.setItem(LAST_ACCOUNT_KEY, raw.accountId);
          this.sheetRef.dismiss(true);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(err, 'Kaydedilemedi, tekrar dene'));
        },
      });
  }
}
