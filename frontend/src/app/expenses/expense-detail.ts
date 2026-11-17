import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { parseAmount } from '../shared/amount-input';
import { MoneyPipe } from '../shared/money.pipe';
import { amountValidator, apiErrorMessage } from './amount-validator';
import { Expense, ExpenseApi, ExpensePayment } from './expense-api';
import { currentPeriod, longDate, periodLabel } from './period';

type Phase = 'past' | 'current' | 'future';

/** Harcama detayı (tam ekran rota): taksitler, tek taksit düzenleme, silme. */
@Component({
  selector: 'app-expense-detail',
  imports: [ReactiveFormsModule, MatIconModule, MoneyPipe, RouterLink],
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    <div class="app-sheet"><div class="app-sheet-panel page">
    <header>
      <a class="app-icon-button" routerLink="/harcamalar" aria-label="Geri">
        <mat-icon fontSet="material-symbols-outlined">chevron_left</mat-icon>
      </a>
      <span class="header-title">Harcama</span>
    </header>

    @if (expense(); as e) {
      <section class="hero">
        <div class="who">
          <span class="initial app-num" aria-hidden="true">{{ initial() }}</span>
          <div class="who-text">
            <h1>{{ title() }}</h1>
            <span class="meta">{{ e.categoryName }} · {{ e.accountName }} · {{ date() }}</span>
          </div>
        </div>
        <span class="total app-num">{{ e.totalAmount | money: e.currency }}</span>
        <span class="sub">
          @if (e.installmentCount > 1 && e.payments.length > 0) {
            {{ e.installmentCount }} taksit · ayda {{ e.payments[0].amount | money: e.currency }}
          } @else {
            Peşin
          }
        </span>
        @if (e.installmentCount > 1) {
          <div class="segments" role="img" [attr.aria-label]="progressLabel()">
            @for (phase of phases(); track $index) {
              <span class="segment" [class]="phase"></span>
            }
          </div>
        }
      </section>

      <h2>{{ e.installmentCount > 1 ? 'Taksitler' : 'Ödeme' }}</h2>
      <ul class="installments app-card">
        @for (payment of e.payments; track payment.installmentNo) {
          <li [class.past]="phaseOf(payment) === 'past'">
            @if (editingNo() === payment.installmentNo) {
              <form (submit)="$event.preventDefault(); savePayment(payment)">
                <span class="no app-num">{{ payment.installmentNo }}/{{ e.installmentCount }}</span>
                <input
                  class="amount-input"
                  inputmode="decimal"
                  [formControl]="amountControl"
                  [attr.aria-label]="payment.installmentNo + '. taksit tutarı'"
                />
                <button type="submit" class="small" [disabled]="saving()">Kaydet</button>
                <button type="button" class="small" (click)="editingNo.set(null)">Vazgeç</button>
              </form>
            } @else {
              <span class="no app-num" [class.now]="phaseOf(payment) === 'current'">
                {{ payment.installmentNo }}/{{ e.installmentCount }}
              </span>
              <span class="period">
                {{ label(payment.period) }}
                @if (phaseOf(payment) === 'current') {
                  <span class="tag">· bu ay</span>
                }
              </span>
              <span class="amount app-num">{{ payment.amount | money: e.currency }}</span>
              <button
                type="button"
                class="edit"
                [attr.aria-label]="payment.installmentNo + '. taksiti düzenle'"
                (click)="startEdit(payment)"
              >
                <mat-icon fontSet="material-symbols-outlined">edit</mat-icon>
              </button>
            }
          </li>
        }
      </ul>
      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
      <button type="button" class="delete" (click)="remove()">Harcamayı sil</button>
    } @else if (loadFailed()) {
      <p class="error" role="alert">Harcama yüklenemedi</p>
    } @else {
      <p class="meta pad">Yükleniyor…</p>
    }
    </div></div>
  `,
  styles: `
    :host {
      display: block;
    }
    .page {
      max-width: 480px;
      margin: 0 auto;
      padding: 18px 16px calc(28px + env(safe-area-inset-bottom));
    }
    @media (min-width: 840px) {
      .page {
        margin: 0;
        padding: 20px 24px 24px;
      }
    }
    header {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-title {
      font-size: 15px;
      font-weight: 600;
    }
    .hero {
      padding: 22px 4px 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .who {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .who-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .initial {
      flex: none;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--app-surface-2);
      color: var(--app-accent-text);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
    }
    h1 {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
    }
    .meta,
    .sub {
      font-size: 13px;
      color: var(--app-muted);
    }
    .sub {
      font-size: 14px;
    }
    .total {
      margin-top: 6px;
      font-size: 42px;
      font-weight: 700;
      letter-spacing: -1px;
      line-height: 1.1;
      overflow-wrap: anywhere;
    }
    .segments {
      display: flex;
      gap: 4px;
      margin-top: 6px;
    }
    .segment {
      flex: 1;
      height: 6px;
      border-radius: 3px;
      background: var(--app-border);
    }
    .segment.past {
      background: var(--app-slate);
    }
    .segment.current {
      background: var(--app-accent);
    }
    h2 {
      margin: 24px 4px 6px;
      font: 600 15px var(--app-font);
    }
    .installments {
      list-style: none;
      margin: 0;
      padding: 4px 0;
    }
    li {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 48px;
      padding: 4px 4px 4px 16px;
      border-bottom: 1px solid var(--app-border);
    }
    li:last-child {
      border-bottom: none;
    }
    li.past .period,
    li.past .amount {
      color: var(--app-muted);
    }
    li form {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .no {
      width: 34px;
      font-size: 13px;
      font-weight: 600;
      color: var(--app-muted);
    }
    .no.now,
    .tag {
      color: var(--app-accent-text);
    }
    .tag {
      font-size: 12px;
    }
    .period {
      flex: 1;
      font-size: 15px;
    }
    .amount {
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
    }
    .edit {
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 12px;
      background: transparent;
      color: var(--app-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .edit mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .edit:focus-visible,
    .small:focus-visible,
    .delete:focus-visible,
    .amount-input:focus-visible {
      outline: 3px solid var(--app-accent-text);
      outline-offset: 2px;
    }
    .amount-input {
      flex: 1;
      min-width: 0;
      height: 44px;
      box-sizing: border-box;
      padding: 0 12px;
      border: 1px solid var(--app-border);
      border-radius: var(--app-radius-input);
      background: var(--app-surface-2);
      color: var(--app-text);
      font: 500 15px var(--app-font-num);
    }
    .small {
      height: 44px;
      padding: 0 10px;
      border: none;
      background: none;
      color: var(--app-accent-text);
      font: 600 14px var(--app-font);
      cursor: pointer;
    }
    .delete {
      width: 100%;
      height: 52px;
      margin-top: 28px;
      border: 1px solid var(--app-danger);
      border-radius: 16px;
      background: transparent;
      color: var(--app-danger);
      font: 600 15px var(--app-font);
      cursor: pointer;
    }
    .error {
      margin: 12px 4px 0;
      color: var(--app-danger);
    }
    .pad {
      padding: 24px 4px;
    }
  `,
})
export class ExpenseDetail {
  private readonly api = inject(ExpenseApi);
  private readonly router = inject(Router);
  private readonly expenseId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  protected readonly expense = signal<Expense | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly editingNo = signal<number | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly amountControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, amountValidator],
  });
  protected readonly label = periodLabel;
  private readonly thisPeriod = currentPeriod(new Date());

  protected readonly title = computed(() => this.expense()?.description || this.expense()?.categoryName || '');
  protected readonly initial = computed(() => this.title().charAt(0).toLocaleUpperCase('tr-TR'));
  protected readonly date = computed(() => longDate(this.expense()?.date ?? ''));
  protected readonly phases = computed(() => (this.expense()?.payments ?? []).map((p) => this.phaseOf(p)));
  protected readonly progressLabel = computed(() => {
    const phases = this.phases();
    const done = phases.filter((p) => p !== 'future').length;
    return `${phases.length} taksitten ${done} tanesi bu aya kadar`;
  });

  constructor() {
    this.api.get(this.expenseId).subscribe({
      next: (expense) => this.expense.set(expense),
      error: () => this.loadFailed.set(true),
    });
  }

  /** Ödeme dönemi ('YYYY-MM') bu aya göre geçmiş / bu ay / gelecek; dönem karşılaştırması, para değil. */
  protected phaseOf(payment: ExpensePayment): Phase {
    if (payment.period === this.thisPeriod) {
      return 'current';
    }
    return payment.period < this.thisPeriod ? 'past' : 'future';
  }

  /** Esc: açık taksit düzenlemesi varsa onu bırakır, yoksa paneli kapatır. */
  protected close(): void {
    if (this.editingNo() !== null) {
      this.editingNo.set(null);
      return;
    }
    this.router.navigate(['/harcamalar']);
  }

  protected startEdit(payment: ExpensePayment): void {
    // Kullanıcı yeni tutarı tr-TR biçiminde yazar; mevcut tutar satırda zaten görünüyor.
    this.amountControl.reset();
    this.error.set(null);
    this.editingNo.set(payment.installmentNo);
  }

  protected savePayment(payment: ExpensePayment): void {
    if (this.amountControl.invalid) {
      this.error.set('Geçerli bir tutar gir');
      return;
    }
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api
      .updatePayment(this.expenseId, payment.installmentNo, parseAmount(this.amountControl.value)!)
      .subscribe({
        next: (expense) => {
          this.saving.set(false);
          this.editingNo.set(null);
          this.expense.set(expense);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(err, 'Kaydedilemedi, tekrar dene'));
        },
      });
  }

  protected remove(): void {
    if (!confirm('Harcama tüm taksitleriyle silinsin mi?')) {
      return;
    }
    this.api.remove(this.expenseId).subscribe({
      next: () => this.router.navigate(['/harcamalar']),
      error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err, 'Silinemedi, tekrar dene')),
    });
  }
}
