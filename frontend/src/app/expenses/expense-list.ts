import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { MoneyPipe } from '../shared/money.pipe';
import { ExpenseApi, PaymentRow, PeriodPayments } from './expense-api';
import { currentPeriod, periodLabel, shiftPeriod, shortDate } from './period';

/** Seçili ayın ödemeleri (harcama tarihine göre değil, ödemenin düştüğü aya göre) ve toplamları. */
@Component({
  selector: 'app-expense-list',
  imports: [MatIconModule, MoneyPipe, RouterLink],
  template: `
    <header>
      <h1 class="page-title">Harcamalar</h1>
      <div class="month" role="group" aria-label="Ay seçici">
        <button type="button" (click)="shift(-1)" aria-label="Önceki ay">
          <mat-icon fontSet="material-symbols-outlined">chevron_left</mat-icon>
        </button>
        <span class="month-label" aria-live="polite">{{ label() }}</span>
        <button type="button" (click)="shift(1)" aria-label="Sonraki ay">
          <mat-icon fontSet="material-symbols-outlined">chevron_right</mat-icon>
        </button>
      </div>
      <a class="app-icon-button gear app-mobile-only" routerLink="/ayarlar" aria-label="Ayarlar">
        <mat-icon fontSet="material-symbols-outlined">settings</mat-icon>
      </a>
    </header>

    @if (loadFailed()) {
      <div class="state">
        <p class="empty">Liste yüklenemedi</p>
        <button type="button" class="app-chip retry" (click)="load()">Tekrar dene</button>
      </div>
    } @else if (data(); as result) {
      @if (result.payments.length === 0) {
        <div class="state">
          <p class="empty">Bu ay ödeme yok</p>
        </div>
      } @else {
        <div class="layout">
        <div class="summary">
        <section class="hero" aria-label="Ay özeti">
          <span class="app-label">Bu ay ödenecek</span>
          @if (mainTotal(); as main) {
            <span class="big app-num">{{ main.amount | money: main.currency }}</span>
          }
          <span class="sub">
            @for (other of otherTotals(); track other.currency) {
              <span class="other">ve {{ other.amount | money: other.currency }} · </span>
            }
            {{ result.payments.length }} ödeme
          </span>
        </section>

        @if (tiles().length > 0) {
          <ul class="cats app-web-only" aria-label="Kategori dağılımı">
            @for (tile of tiles(); track tile.categoryId) {
              <li class="cat">
                <span class="cat-name">{{ tile.name }}</span>
                <span class="cat-pct app-num">{{ pct(tile.sharePct) }}</span>
                <span class="cat-amount app-num">{{ tile.amount | money: tile.currency }}</span>
                <span class="bar"><span class="fill" [style.width]="tile.sharePct + '%'"></span></span>
              </li>
            }
          </ul>
          <ul class="tiles app-mobile-only" aria-label="Kategoriler">
            @for (tile of tiles(); track tile.categoryId) {
              <li class="tile">
                <span class="tile-name">{{ tile.name }}</span>
                <span class="tile-amount app-num">{{ tile.amount | money: tile.currency }}</span>
                <span class="bar"><span class="fill" [style.width]="tile.sharePct + '%'"></span></span>
              </li>
            }
          </ul>
        }

        </div>

        <table class="ptable app-web-only" aria-label="Ödemeler">
          <thead>
            <tr>
              <th scope="col">Tarih</th>
              <th scope="col">Açıklama</th>
              <th scope="col">Kategori</th>
              <th scope="col" class="col-account">Hesap</th>
              <th scope="col">Taksit</th>
              <th scope="col" class="num">Tutar</th>
            </tr>
          </thead>
          <tbody>
            @for (payment of result.payments; track payment.expenseId) {
              <tr>
                <td class="muted">{{ shortDate(payment.expenseDate) }}</td>
                <td>
                  <span class="desc">
                    <span class="initial app-num" aria-hidden="true">{{ initial(payment) }}</span>
                    <a class="rowlink" [routerLink]="['/harcamalar', payment.expenseId]">{{ title(payment) }}</a>
                  </span>
                </td>
                <td class="muted">{{ payment.categoryName }}</td>
                <td class="muted col-account">{{ payment.accountName }}</td>
                <td class="muted">{{ badge(payment) }}</td>
                <td class="num app-num">{{ payment.amount | money: payment.currency }}</td>
              </tr>
            }
          </tbody>
        </table>
        </div>

        <h2 class="app-mobile-only">Ödemeler</h2>
        <ul class="payments app-mobile-only">
          @for (payment of result.payments; track payment.expenseId) {
            <li>
              <a class="row" [routerLink]="['/harcamalar', payment.expenseId]">
                <span class="initial app-num" aria-hidden="true">{{ initial(payment) }}</span>
                <span class="text">
                  <span class="title">{{ title(payment) }}</span>
                  <span class="meta">
                    {{ payment.categoryName }} · {{ shortDate(payment.expenseDate) }} · {{ payment.accountName }}
                  </span>
                </span>
                <span class="side">
                  <span class="amount app-num">{{ payment.amount | money: payment.currency }}</span>
                  <span class="badge">{{ badge(payment) }}</span>
                </span>
              </a>
            </li>
          }
        </ul>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      max-width: 640px;
      padding: 22px 20px 0;
      box-sizing: border-box;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    /* Telefonda başlık yalnız ekran okuyucuya; web'de solda büyük görünür. */
    .page-title {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      margin: 0;
    }
    .layout,
    .summary {
      display: contents;
    }
    .month {
      display: flex;
      align-items: center;
      height: 44px;
      border: 1px solid var(--app-border);
      border-radius: 22px;
      background: var(--app-surface);
      box-shadow: var(--app-shadow);
    }
    .month button {
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 22px;
      background: none;
      color: var(--app-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .month button:focus-visible {
      outline: 3px solid var(--app-accent-text);
      outline-offset: -2px;
    }
    .month-label {
      min-width: 96px;
      text-align: center;
      font: 500 14px var(--app-font);
    }
    .gear {
      color: var(--app-muted);
    }
    .hero {
      padding-top: 26px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .hero .app-label {
      font-size: 13px;
    }
    .big {
      font-size: 46px;
      font-weight: 700;
      letter-spacing: -1px;
      line-height: 1.1;
      overflow-wrap: anywhere;
    }
    .sub {
      font-size: 14px;
      color: var(--app-muted);
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .tiles {
      display: flex;
      gap: 8px;
      margin: 20px -20px 0;
      padding: 0 20px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .tile {
      flex: none;
      min-width: 96px;
      box-sizing: border-box;
      padding: 10px 12px;
      border-radius: 16px;
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      box-shadow: var(--app-shadow);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .tile-name {
      font-size: 12px;
      color: var(--app-muted);
    }
    .tile-amount {
      font-size: 15px;
      font-weight: 600;
    }
    .bar {
      height: 4px;
      border-radius: 2px;
      background: var(--app-border);
      display: flex;
    }
    .fill {
      background: var(--app-accent);
      border-radius: 2px;
    }
    h2 {
      margin: 26px 0 6px;
      font: 600 15px var(--app-font);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 52px;
      padding: 10px 8px;
      border-bottom: 1px solid var(--app-border);
      color: var(--app-text);
      text-decoration: none;
    }
    .row:focus-visible {
      outline: 3px solid var(--app-accent-text);
      outline-offset: -2px;
      border-radius: 12px;
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
    .text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .title {
      font-size: 15px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta,
    .badge {
      font-size: 12px;
      color: var(--app-muted);
    }
    .meta {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .side {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
    .amount {
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
    }
    .cats {
      margin-top: 22px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .cat {
      display: grid;
      grid-template-columns: 1fr auto auto;
      column-gap: 12px;
      row-gap: 6px;
      align-items: baseline;
    }
    .cat-name {
      font-size: 14px;
      font-weight: 500;
    }
    .cat-pct {
      font-size: 12px;
      color: var(--app-muted);
    }
    .cat-amount {
      font-size: 14px;
      font-weight: 600;
    }
    .cat .bar {
      grid-column: 1 / -1;
      height: 6px;
      border-radius: 3px;
    }
    .cat .fill {
      border-radius: 3px;
    }
    .ptable {
      width: 100%;
      border-collapse: collapse;
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: var(--app-radius-card);
      box-shadow: var(--app-shadow);
      table-layout: fixed;
    }
    .ptable th {
      padding: 14px 16px;
      text-align: left;
      font: 500 12px var(--app-font);
      color: var(--app-muted);
      border-bottom: 1px solid var(--app-border);
    }
    .ptable td {
      height: 56px;
      padding: 0 16px;
      font-size: 14px;
      border-bottom: 1px solid var(--app-border);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ptable tbody tr {
      position: relative;
    }
    .ptable tbody tr:last-child td {
      border-bottom: none;
    }
    .ptable tbody tr:hover {
      background: var(--app-surface-2);
    }
    .ptable .num {
      text-align: right;
      font-weight: 600;
    }
    .ptable .muted {
      color: var(--app-muted);
    }
    .desc {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .desc .initial {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      font-size: 13px;
    }
    .rowlink {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      color: var(--app-text);
      text-decoration: none;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    /* Tüm satır tıklanabilir: bağlantının görünmez katmanı satırı kaplar. */
    .rowlink::after {
      content: '';
      position: absolute;
      inset: 0;
    }
    .rowlink:focus-visible {
      outline: none;
    }
    .rowlink:focus-visible::after {
      outline: 3px solid var(--app-accent-text);
      outline-offset: -3px;
      border-radius: 12px;
    }
    @media (min-width: 840px) {
      :host {
        max-width: none;
        padding: 28px 0 0;
      }
      .page-title {
        position: static;
        width: auto;
        height: auto;
        overflow: visible;
        clip-path: none;
        font: 700 24px var(--app-font);
      }
      .layout {
        display: grid;
        grid-template-columns: 360px minmax(0, 1fr);
        gap: 24px;
        align-items: start;
        margin-top: 24px;
      }
      .summary {
        display: block;
        padding: 24px;
        border: 1px solid var(--app-border);
        border-radius: var(--app-radius-card);
        background: var(--app-surface);
        box-shadow: var(--app-shadow);
      }
      .hero {
        padding-top: 0;
      }
    }
    @media (min-width: 840px) and (max-width: 1000px) {
      .col-account {
        display: none;
      }
    }
    .state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 64px 0;
    }
    .empty {
      margin: 0;
      color: var(--app-muted);
    }
  `,
})
export class ExpenseList {
  private readonly api = inject(ExpenseApi);

  protected readonly period = signal(currentPeriod(new Date()));
  protected readonly label = () => periodLabel(this.period());
  protected readonly data = signal<PeriodPayments | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly shortDate = shortDate;

  /** Ana para birimi: API'nin döndürdüğü ilk toplam. */
  protected readonly mainTotal = computed(() => this.data()?.totals[0] ?? null);
  protected readonly otherTotals = computed(() => this.data()?.totals.slice(1) ?? []);
  /** Kategori kutucukları yalnız ana para biriminin kategorilerini gösterir. */
  protected readonly tiles = computed(() => {
    const main = this.mainTotal();
    return main ? (this.data()?.categoryTotals ?? []).filter((t) => t.currency === main.currency) : [];
  });
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

  /** Backend'in "33.48" yüzdesi → "%33,48" (yalnız gösterim, hesap yok). */
  protected pct(sharePct: string): string {
    return `%${sharePct.replace('.', ',')}`;
  }

  protected title(p: PaymentRow): string {
    return p.description || p.categoryName;
  }

  protected initial(p: PaymentRow): string {
    return this.title(p).charAt(0).toLocaleUpperCase('tr-TR');
  }

  protected badge(p: PaymentRow): string {
    return p.installmentCount > 1 ? `${p.installmentNo}/${p.installmentCount} taksit` : 'Peşin';
  }
}
