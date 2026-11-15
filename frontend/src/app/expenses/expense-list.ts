import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';
import { MoneyPipe } from '../shared/money.pipe';
import { ExpenseApi, PeriodPayments } from './expense-api';
import { ExpenseDetail, ExpenseDetailData } from './expense-detail';
import { ExpenseEntry } from './expense-entry';
import { currentPeriod, periodLabel, shiftPeriod } from './period';

/** Seçili ayın ödemeleri (harcama tarihine göre değil, ödemenin düştüğü aya göre) ve toplamları. */
@Component({
  selector: 'app-expense-list',
  imports: [DatePipe, MatButtonModule, MatIconModule, MoneyPipe],
  template: `
    <header>
      <button matIconButton (click)="shift(-1)" aria-label="Önceki ay">
        <mat-icon fontSet="material-symbols-outlined">chevron_left</mat-icon>
      </button>
      <h1>{{ label() }}</h1>
      <button matIconButton (click)="shift(1)" aria-label="Sonraki ay">
        <mat-icon fontSet="material-symbols-outlined">chevron_right</mat-icon>
      </button>
    </header>

    @if (loadFailed()) {
      <p class="empty">Liste yüklenemedi</p>
      <button matButton class="retry" (click)="load()">Tekrar dene</button>
    } @else if (data(); as result) {
      @if (result.payments.length === 0) {
        <p class="empty">Bu ay ödeme yok</p>
      } @else {
        <div class="totals" aria-label="Ay toplamı">
          @for (total of result.totals; track total.currency) {
            <span class="total">{{ total.amount | money: total.currency }}</span>
          }
        </div>
        <ul>
          @for (payment of result.payments; track payment.expenseId) {
            <li>
              <button class="row" (click)="openDetail(payment.expenseId)">
                <span class="text">
                  <span class="title">
                    {{ payment.categoryName }}
                    @if (payment.installmentCount > 1) {
                      <span class="badge">{{ payment.installmentNo }}/{{ payment.installmentCount }}</span>
                    }
                  </span>
                  @if (payment.description) {
                    <span class="description">{{ payment.description }}</span>
                  }
                  <span class="meta">
                    {{ payment.accountName }} · {{ payment.expenseDate | date: 'dd.MM.yyyy' }}
                  </span>
                </span>
                <span class="amount">{{ payment.amount | money: payment.currency }}</span>
              </button>
            </li>
          }
        </ul>
      }
    }

    <button matFab class="fab" (click)="openEntry()" aria-label="Harcama ekle">
      <mat-icon fontSet="material-symbols-outlined">add</mat-icon>
    </button>
  `,
  styles: `
    :host {
      display: block;
      max-width: 640px;
      /* Son satır FAB'ın altında kalmasın. */
      padding-bottom: 72px;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    h1 {
      font: var(--mat-sys-title-large);
      margin: 0;
    }
    .totals {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 24px;
      padding: 12px 0;
    }
    .total {
      font: var(--mat-sys-headline-small);
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 64px;
      padding: 8px 0;
      border: none;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      background: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .title {
      font: var(--mat-sys-body-large);
    }
    .badge {
      margin-left: 6px;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      font: var(--mat-sys-label-medium);
    }
    .description {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta,
    .empty {
      color: var(--mat-sys-on-surface-variant);
    }
    .amount {
      font: var(--mat-sys-title-medium);
      white-space: nowrap;
    }
    .fab {
      position: fixed;
      right: 16px;
      /* Alt menünün (64px) üstünde. */
      bottom: calc(80px + env(safe-area-inset-bottom));
      z-index: 1;
    }
    @media (min-width: 840px) {
      .fab {
        right: 24px;
        bottom: 24px;
      }
    }
  `,
})
export class ExpenseList {
  private readonly api = inject(ExpenseApi);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly dialog = inject(MatDialog);

  protected readonly period = signal(currentPeriod(new Date()));
  protected readonly label = () => periodLabel(this.period());
  protected readonly data = signal<PeriodPayments | null>(null);
  protected readonly loadFailed = signal(false);
  private request?: Subscription;

  constructor() {
    this.load();
  }

  protected shift(delta: number): void {
    this.period.update((p) => shiftPeriod(p, delta));
    this.data.set(null);
    this.load();
  }

  protected load(): void {
    // Aylar arasında hızlı geçişte geç gelen eski yanıt yeni ayın üstüne yazmasın.
    this.request?.unsubscribe();
    this.loadFailed.set(false);
    this.request = this.api.list(this.period()).subscribe({
      next: (result) => this.data.set(result),
      error: () => this.loadFailed.set(true),
    });
  }

  protected openEntry(): void {
    this.bottomSheet
      .open<ExpenseEntry, unknown, boolean>(ExpenseEntry)
      .afterDismissed()
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected openDetail(expenseId: number): void {
    const wide = window.innerWidth >= 840;
    this.dialog
      .open<ExpenseDetail, ExpenseDetailData>(ExpenseDetail, {
        data: { expenseId },
        // Mobilde tam ekran.
        width: wide ? '480px' : '100vw',
        height: wide ? undefined : '100dvh',
        maxWidth: '100vw',
      })
      .afterClosed()
      // Detay dışına dokunarak ya da Esc ile de kapanabilir; taksit düzenlenmiş olabileceği için her
      // kapanışta liste yenilenir.
      .subscribe(() => this.load());
  }
}
