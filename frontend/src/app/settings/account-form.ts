import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { apiErrorMessage } from '../expenses/amount-validator';
import { ACCOUNT_TYPE_LABELS, Account, AccountApi, AccountInput, AccountType } from './account-api';

/** Hesap ekleme/düzenleme dialogu. Veri: düzenlenecek hesap ya da null (yeni). Kaydedince true ile kapanır. */
@Component({
  selector: 'app-account-form',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ account ? 'Hesabı düzenle' : 'Hesap ekle' }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        <mat-form-field>
          <mat-label>Ad</mat-label>
          <input matInput formControlName="name" maxlength="60" autocomplete="off" />
          @if (form.controls.name.invalid) {
            <mat-error>Ad gerekli</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>Tür</mat-label>
          <select matNativeControl formControlName="type">
            @for (type of types; track type) {
              <option [value]="type">{{ typeLabels[type] }}</option>
            }
          </select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Para birimi</mat-label>
          <select matNativeControl formControlName="currency">
            @for (currency of currencies; track currency) {
              <option [value]="currency">{{ currency }}</option>
            }
          </select>
        </mat-form-field>
        @if (isCard()) {
          <mat-form-field>
            <mat-label>Kesim günü</mat-label>
            <input matInput type="number" inputmode="numeric" min="1" max="31" formControlName="statementDay" />
            <mat-hint>Ekstrenin kesildiği gün; taksitlerin hangi aya düşeceğini belirler</mat-hint>
            @if (form.controls.statementDay.invalid) {
              <mat-error>Kesim günü 1–31 arasında olmalı</mat-error>
            }
          </mat-form-field>
        }
        @if (error(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close>Vazgeç</button>
        <button matButton="filled" type="submit" [disabled]="saving()">
          {{ saving() ? 'Kaydediliyor…' : 'Kaydet' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-dialog-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 8px !important;
    }
    mat-form-field {
      width: 100%;
    }
    button {
      min-height: 48px;
    }
    .error {
      color: var(--mat-sys-error);
      margin: 0;
    }
  `,
})
export class AccountForm {
  private readonly api = inject(AccountApi);
  private readonly dialogRef = inject<MatDialogRef<AccountForm, boolean>>(MatDialogRef);
  protected readonly account = inject<Account | null>(MAT_DIALOG_DATA);

  protected readonly types: AccountType[] = ['CASH', 'BANK', 'CREDIT_CARD'];
  protected readonly typeLabels = ACCOUNT_TYPE_LABELS;
  protected readonly currencies = ['TRY', 'USD', 'EUR'];

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    name: [this.account?.name ?? '', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(60)]],
    type: [this.account?.type ?? ('CASH' as AccountType)],
    currency: [this.account?.currency ?? 'TRY'],
    statementDay: this.fb.control<number | null>(this.account?.statementDay ?? null, [
      Validators.required,
      Validators.min(1),
      Validators.max(31),
      Validators.pattern(/^\d+$/),
    ]),
  });
  protected readonly isCard = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.syncStatementDay(this.form.controls.type.value);
    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((type) => this.syncStatementDay(type));
  }

  /** Kesim günü yalnız kredi kartında sorulur; diğer türlerde alan devre dışıdır ve doğrulanmaz. */
  private syncStatementDay(type: AccountType): void {
    const isCard = type === 'CREDIT_CARD';
    this.isCard.set(isCard);
    if (isCard) {
      this.form.controls.statementDay.enable();
    } else {
      this.form.controls.statementDay.disable();
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.saving()) {
      return;
    }
    const raw = this.form.getRawValue();
    const input: AccountInput = {
      name: raw.name.trim(),
      type: raw.type,
      currency: raw.currency,
      statementDay: this.isCard() ? raw.statementDay : null,
    };
    this.saving.set(true);
    this.error.set(null);
    const request = this.account ? this.api.update(this.account.id, input) : this.api.create(input);
    request.subscribe({
      next: () => this.dialogRef.close(true),
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(err, 'Kaydedilemedi, tekrar dene'));
      },
    });
  }
}
