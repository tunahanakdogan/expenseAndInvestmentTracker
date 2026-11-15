import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { parseAmount } from '../shared/amount-input';
import { MoneyPipe } from '../shared/money.pipe';
import { amountValidator, apiErrorMessage } from './amount-validator';
import { Expense, ExpenseApi, ExpensePayment } from './expense-api';
import { periodLabel } from './period';

export interface ExpenseDetailData {
  expenseId: number;
}

/** Harcama detayı: taksitler, tek taksit düzenleme, silme. Bir şey değiştiyse true ile kapanır. */
@Component({
  selector: 'app-expense-detail',
  imports: [DatePipe, ReactiveFormsModule, MatButtonModule, MatDialogModule, MoneyPipe],
  template: `
    @if (expense(); as e) {
      <h2 mat-dialog-title>{{ e.categoryName }}</h2>
      <mat-dialog-content>
        @if (e.description) {
          <p class="description">{{ e.description }}</p>
        }
        <p class="meta">{{ e.accountName }} · {{ e.date | date: 'dd.MM.yyyy' }}</p>
        <p class="total">
          <span>Toplam</span>
          <strong>{{ e.totalAmount | money: e.currency }}</strong>
        </p>

        <ul>
          @for (payment of e.payments; track payment.installmentNo) {
            <li>
              @if (editingNo() === payment.installmentNo) {
                <form (submit)="$event.preventDefault(); savePayment(payment)">
                  <span class="no">{{ payment.installmentNo }}/{{ e.installmentCount }}</span>
                  <input
                    class="amount-input"
                    inputmode="decimal"
                    [formControl]="amountControl"
                    [attr.aria-label]="payment.installmentNo + '. taksit tutarı'"
                  />
                  <button matButton type="submit" [disabled]="saving()">Kaydet</button>
                  <button matButton type="button" (click)="editingNo.set(null)">Vazgeç</button>
                </form>
              } @else {
                <span class="no">{{ payment.installmentNo }}/{{ e.installmentCount }}</span>
                <span class="period">{{ label(payment.period) }}</span>
                <span class="amount">{{ payment.amount | money: e.currency }}</span>
                <button matButton class="edit" (click)="startEdit(payment)">Düzenle</button>
              }
            </li>
          }
        </ul>
        @if (error(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton class="delete" (click)="remove()">Sil</button>
        <button matButton="filled" class="close" (click)="close()">Kapat</button>
      </mat-dialog-actions>
    } @else {
      <mat-dialog-content>
        @if (loadFailed()) {
          <p class="error" role="alert">Harcama yüklenemedi</p>
        } @else {
          <p class="meta">Yükleniyor…</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button matButton class="close" (click)="close()">Kapat</button>
      </mat-dialog-actions>
    }
  `,
  styles: `
    p {
      margin: 0 0 4px;
    }
    .meta {
      color: var(--mat-sys-on-surface-variant);
    }
    .total {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin: 12px 0;
      font: var(--mat-sys-title-medium);
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li,
    li form {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 48px;
    }
    li {
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    li form {
      flex: 1;
    }
    .no {
      min-width: 40px;
      color: var(--mat-sys-on-surface-variant);
    }
    .period {
      flex: 1;
    }
    .amount {
      white-space: nowrap;
    }
    .amount-input {
      flex: 1;
      min-width: 0;
      height: 40px;
      padding: 0 8px;
      font: var(--mat-sys-body-large);
      color: inherit;
      background: transparent;
      border: 1px solid var(--mat-sys-outline);
      border-radius: 4px;
    }
    .delete {
      color: var(--mat-sys-error);
      margin-right: auto;
    }
    .error {
      color: var(--mat-sys-error);
      margin-top: 8px;
    }
  `,
})
export class ExpenseDetail {
  private readonly api = inject(ExpenseApi);
  private readonly dialogRef = inject<MatDialogRef<ExpenseDetail, boolean>>(MatDialogRef);
  private readonly data = inject<ExpenseDetailData>(MAT_DIALOG_DATA);

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
  private changed = false;

  constructor() {
    this.api.get(this.data.expenseId).subscribe({
      next: (expense) => this.expense.set(expense),
      error: () => this.loadFailed.set(true),
    });
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
      .updatePayment(this.data.expenseId, payment.installmentNo, parseAmount(this.amountControl.value)!)
      .subscribe({
        next: (expense) => {
          this.changed = true;
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
    this.api.remove(this.data.expenseId).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err: HttpErrorResponse) => this.error.set(apiErrorMessage(err, 'Silinemedi, tekrar dene')),
    });
  }

  protected close(): void {
    this.dialogRef.close(this.changed);
  }
}
