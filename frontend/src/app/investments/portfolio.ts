import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MoneyPipe } from '../shared/money.pipe';
import { formatDecimal, formatPct, gainClass, plus } from './format';
import { InvestmentApi } from './investment-api';
import { AllocationItem, Portfolio as PortfolioData, SHORT_TYPE_LABELS } from './models';

/** Yatırımlar ana sayfası: TRY toplamı, dağılım çubuğu ve varlık kartları. Tüm sayılar backend'den hazır gelir. */
@Component({
  selector: 'app-portfolio',
  imports: [DatePipe, MatIconModule, MoneyPipe, RouterLink],
  template: `
    <header>
      <h1>Portföy</h1>
      <div class="actions">
        <button
          type="button"
          class="app-icon-button refresh"
          [class.spin]="refreshing()"
          (click)="refreshPrices()"
          [disabled]="refreshing()"
          aria-label="Fiyatları güncelle"
        >
          <mat-icon fontSet="material-symbols-outlined">refresh</mat-icon>
        </button>
        <a class="app-icon-button" routerLink="/ayarlar" aria-label="Ayarlar">
          <mat-icon fontSet="material-symbols-outlined">settings</mat-icon>
        </a>
      </div>
    </header>
    @if (refreshMessage(); as message) {
      <p class="refresh-status" role="status">{{ message }}</p>
    }
    @if (error()) {
      <p class="error" role="alert">Portföy yüklenemedi</p>
    } @else if (portfolio(); as p) {
      <section class="summary" aria-label="Portföy özeti">
        <span class="app-label">Toplam değer</span>
        <strong class="total app-num">
          {{ p.totalMarketValueTry === null ? 'Fiyat yok' : (p.totalMarketValueTry | money: 'TRY') }}
        </strong>
        <div class="sub">
          @if (p.totalUnrealizedGainTry !== null) {
            <span
              class="badge app-num"
              [class.loss-badge]="gainClass(p.totalUnrealizedGainTry) === 'loss'"
              data-testid="gain-badge"
            >
              {{ plus(p.totalUnrealizedGainTry) }}{{ p.totalUnrealizedGainTry | money: 'TRY' }}
              @if (p.totalUnrealizedGainPctTry !== null) {
                · {{ formatPct(p.totalUnrealizedGainPctTry) }}
              }
            </span>
          }
          <span class="cost">maliyet {{ p.totalCostTry | money: 'TRY' }}</span>
        </div>
      </section>
      @if (p.allocation.length > 0) {
        <div class="strip" role="img" [attr.aria-label]="allocationText(p.allocation)">
          @for (seg of p.allocation; track seg.type; let i = $index) {
            <div
              [class]="'seg seg-' + (i > 3 ? 3 : i)"
              [style.flex]="seg.sharePct"
              data-testid="alloc-segment"
            >
              {{ i === 0 ? shortLabels[seg.type] + ' ' : '' }}%{{ formatDecimal(seg.sharePct) }}
            </div>
          }
        </div>
        <ul class="legend" aria-hidden="true">
          @for (seg of p.allocation; track seg.type; let i = $index) {
            <li data-testid="alloc-legend">
              <i [class]="'dot seg-' + (i > 3 ? 3 : i)"></i>{{ shortLabels[seg.type] }}
            </li>
          }
        </ul>
      }
      @if (p.missingPrices) {
        <p class="warning">Bazı varlıkların fiyatı yok; toplam değere katılmadı</p>
      }
      <h2>Varlıklar</h2>
      @if (p.assets.length === 0) {
        <p class="empty">Henüz varlık yok. + ile ilk işlemini ekle</p>
      }
      <div class="cards">
        @for (item of p.assets; track item.assetId) {
          <a class="card-link" [routerLink]="['varlik', item.assetId]">
            <article class="asset app-card" data-testid="asset-card">
              <span class="badge-box app-num" aria-hidden="true">{{ item.symbol.slice(0, 3) }}</span>
              <div class="info">
                <span class="name">{{ item.name }}</span>
                <span class="meta">
                  {{ item.symbol }} · {{ formatDecimal(item.quantity) }} adet · ort.
                  {{ item.averageCost | money: item.currency }}
                </span>
                @if (item.priceDate) {
                  <span class="meta">Fiyat tarihi {{ item.priceDate | date: 'dd.MM.yyyy' }}</span>
                }
              </div>
              <div class="values">
                @if (item.marketValue === null) {
                  <span class="value muted">Fiyat yok</span>
                } @else {
                  <span class="value app-num">{{ item.marketValue | money: item.currency }}</span>
                }
                @if (item.unrealizedGain !== null) {
                  <span class="pct app-num" [class]="gainClass(item.unrealizedGain)">
                    {{ plus(item.unrealizedGain) }}{{ formatPct(item.unrealizedGainPct) }}
                  </span>
                }
                @if (item.type === 'US_STOCK' && item.marketValueTry !== null) {
                  <span class="pct app-num" [class]="gainClass(item.unrealizedGainTry)">
                    {{ item.marketValueTry | money: 'TRY' }} ·
                    {{ plus(item.unrealizedGainTry) }}{{ formatPct(item.unrealizedGainPctTry) }}
                  </span>
                }
                @if (gainClass(item.realizedGain) !== '') {
                  <span class="meta">
                    Gerçekleşen
                    <span [class]="gainClass(item.realizedGain)">{{
                      item.realizedGain | money: item.currency
                    }}</span>
                  </span>
                }
              </div>
            </article>
          </a>
        }
      </div>
    } @else {
      <p class="loading">Yükleniyor…</p>
    }
  `,
  styles: `
    :host {
      display: block;
      box-sizing: border-box;
      max-width: 640px;
      margin: 0 auto;
      padding: 22px 20px 0;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    h1 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    .refresh {
      color: var(--app-accent-text);
    }
    .refresh:disabled {
      opacity: 0.6;
      cursor: default;
    }
    .spin mat-icon {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .spin mat-icon {
        animation: none;
      }
    }
    .refresh-status,
    .loading,
    .empty,
    .warning {
      color: var(--app-muted);
      font-size: 13px;
      margin: 12px 0 0;
    }
    .error {
      color: var(--app-danger);
    }
    .summary {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 22px;
    }
    .summary .app-label {
      font-size: 13px;
    }
    .total {
      font-weight: 700;
      font-size: 44px;
      line-height: 1.1;
      letter-spacing: -1px;
    }
    .sub {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .badge {
      height: 28px;
      padding: 0 10px;
      border-radius: 14px;
      background: var(--app-accent-soft);
      color: var(--app-accent-text);
      font-weight: 600;
      font-size: 13px;
      display: inline-flex;
      align-items: center;
    }
    .badge.loss-badge {
      color: var(--app-danger);
      background: color-mix(in srgb, var(--app-danger) 16%, transparent);
    }
    .cost {
      font-size: 13px;
      color: var(--app-muted);
    }
    .strip {
      margin-top: 22px;
      display: flex;
      height: 36px;
      border-radius: 12px;
      overflow: hidden;
      gap: 3px;
    }
    .seg {
      min-width: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      overflow: hidden;
      font: 600 12px var(--app-font);
    }
    .seg-0 {
      background: var(--app-accent);
      color: var(--app-accent-ink);
    }
    .strip .seg-0 {
      justify-content: flex-start;
      padding-left: 10px;
    }
    .seg-1 {
      background: var(--app-gold);
      color: var(--app-accent-ink);
    }
    .seg-2 {
      background: var(--app-slate);
      color: #fff;
    }
    .seg-3 {
      background: var(--app-surface-2);
      color: var(--app-text);
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      list-style: none;
      margin: 8px 0 0;
      padding: 0;
      font-size: 12px;
      color: var(--app-muted);
    }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 4px;
      margin-right: 6px;
      border: 1px solid var(--app-border);
    }
    h2 {
      margin: 26px 0 6px;
      padding: 0 8px;
      font-size: 15px;
      font-weight: 600;
    }
    .cards {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .card-link {
      color: inherit;
      text-decoration: none;
      border-radius: var(--app-radius-card);
      &:focus-visible {
        outline: 3px solid var(--app-accent-text);
        outline-offset: 2px;
      }
    }
    .asset {
      box-sizing: border-box;
      min-height: 44px;
      padding: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge-box {
      width: 42px;
      height: 42px;
      flex: none;
      border-radius: 12px;
      background: var(--app-surface-2);
      color: var(--app-accent-text);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 12px;
    }
    .info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .name {
      font-size: 15px;
      font-weight: 500;
    }
    .meta {
      font-size: 12px;
      color: var(--app-muted);
    }
    .values {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 3px;
      text-align: right;
    }
    .value {
      font-weight: 600;
      font-size: 15px;
    }
    .value.muted {
      font: 500 13px var(--app-font);
      color: var(--app-muted);
    }
    .pct {
      font-weight: 600;
      font-size: 12px;
    }
  `,
})
export class Portfolio {
  private readonly api = inject(InvestmentApi);

  protected readonly portfolio = signal<PortfolioData | null>(null);
  protected readonly error = signal(false);
  protected readonly refreshing = signal(false);
  protected readonly refreshMessage = signal<string | null>(null);
  protected readonly shortLabels = SHORT_TYPE_LABELS;
  protected readonly formatDecimal = formatDecimal;
  protected readonly formatPct = formatPct;
  protected readonly gainClass = gainClass;
  protected readonly plus = plus;

  constructor() {
    this.load();
  }

  protected refreshPrices(): void {
    this.refreshing.set(true);
    this.refreshMessage.set('Fiyatlar güncelleniyor…');
    this.api.refreshPrices().subscribe({
      next: (result) => {
        this.refreshing.set(false);
        this.refreshMessage.set(refreshSummary(result.failed));
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.refreshing.set(false);
        this.refreshMessage.set(
          err.status === 429
            ? (err.error?.detail ?? 'Biraz bekleyip tekrar dene')
            : 'Fiyatlar güncellenemedi, tekrar dene',
        );
      },
    });
  }

  /** Erişilebilir ad: "Varlık dağılımı: BIST %65, Altın %18". */
  protected allocationText(allocation: AllocationItem[]): string {
    const parts = allocation.map((a) => `${SHORT_TYPE_LABELS[a.type]} %${formatDecimal(a.sharePct)}`);
    return `Varlık dağılımı: ${parts.join(', ')}`;
  }

  private load(): void {
    this.api.portfolio().subscribe({
      next: (p) => {
        this.error.set(false);
        this.portfolio.set(p);
      },
      error: () => this.error.set(true),
    });
  }
}

/** "RATES" → "kurlar", "FUND:AFT" → "AFT". */
function refreshSummary(failed: string[]): string {
  if (failed.length === 0) {
    return 'Fiyatlar güncellendi';
  }
  const names = failed.map((f) => (f === 'RATES' ? 'kurlar' : f.slice(f.indexOf(':') + 1)));
  return `Fiyatlar güncellendi. Alınamayanlar: ${names.join(', ')}`;
}
