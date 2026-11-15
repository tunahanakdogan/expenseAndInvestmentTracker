import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MoneyPipe } from '../shared/money.pipe';
import { formatDecimal, formatPct, gainClass } from './format';
import { InvestmentApi } from './investment-api';
import { ASSET_TYPE_LABELS, Portfolio as PortfolioData } from './models';

/** Yatırımlar ana sayfası: TRY toplamları ve varlık kartları. Tüm sayılar backend'den hazır gelir. */
@Component({
  selector: 'app-portfolio',
  imports: [DatePipe, MatButtonModule, MatCardModule, MatIconModule, MoneyPipe, RouterLink],
  template: `
    <h1>Yatırımlar</h1>
    @if (error()) {
      <p class="error" role="alert">Portföy yüklenemedi</p>
    } @else if (portfolio(); as p) {
      <section class="summary" aria-label="Portföy özeti">
        <div class="total">
          <span class="label">Toplam değer</span>
          <strong>
            {{ p.totalMarketValueTry === null ? 'Fiyat yok' : (p.totalMarketValueTry | money: 'TRY') }}
          </strong>
        </div>
        <div>
          <span class="label">Maliyet</span>
          <span>{{ p.totalCostTry | money: 'TRY' }}</span>
        </div>
        @if (p.totalUnrealizedGainTry !== null) {
          <div>
            <span class="label">Getiri</span>
            <span [class]="gainClass(p.totalUnrealizedGainTry)">
              {{ p.totalUnrealizedGainTry | money: 'TRY' }} {{ formatPct(p.totalUnrealizedGainPctTry) }}
            </span>
          </div>
        }
      </section>
      @if (p.missingPrices) {
        <p class="warning">Bazı varlıkların fiyatı yok; toplam değere katılmadı</p>
      }
      @if (p.assets.length === 0) {
        <p class="empty">Henüz varlık yok. + ile ilk işlemini ekle</p>
      }
      <div class="cards">
        @for (item of p.assets; track item.assetId) {
          <a class="card-link" [routerLink]="['varlik', item.assetId]">
            <mat-card appearance="outlined" data-testid="asset-card">
              <mat-card-header>
                <mat-card-title>{{ item.name }}</mat-card-title>
                <mat-card-subtitle>{{ item.symbol }} · {{ typeLabels[item.type] }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <dl>
                  <div>
                    <dt>Adet</dt>
                    <dd>{{ formatDecimal(item.quantity) }}</dd>
                  </div>
                  <div>
                    <dt>Ort. maliyet</dt>
                    <dd>{{ item.averageCost | money: item.currency }}</dd>
                  </div>
                  <div>
                    <dt>Güncel değer</dt>
                    <dd>
                      {{ item.marketValue === null ? 'Fiyat yok' : (item.marketValue | money: item.currency) }}
                    </dd>
                  </div>
                  @if (item.unrealizedGain !== null) {
                    <div>
                      <dt>Getiri</dt>
                      <dd [class]="gainClass(item.unrealizedGain)">
                        {{ item.unrealizedGain | money: item.currency }} {{ formatPct(item.unrealizedGainPct) }}
                      </dd>
                    </div>
                  }
                  @if (item.type === 'US_STOCK') {
                    <div>
                      <dt>Ort. maliyet (TL)</dt>
                      <dd>{{ item.averageCostTry | money: 'TRY' }}</dd>
                    </div>
                    @if (item.marketValueTry !== null) {
                      <div>
                        <dt>Güncel değer (TL)</dt>
                        <dd [class]="gainClass(item.unrealizedGainTry)">
                          {{ item.marketValueTry | money: 'TRY' }} {{ formatPct(item.unrealizedGainPctTry) }}
                        </dd>
                      </div>
                    }
                  }
                  @if (gainClass(item.realizedGain) !== '') {
                    <div>
                      <dt>Gerçekleşen</dt>
                      <dd [class]="gainClass(item.realizedGain)">{{ item.realizedGain | money: item.currency }}</dd>
                    </div>
                  }
                  @if (item.priceDate) {
                    <div class="muted">
                      <dt>Fiyat tarihi</dt>
                      <dd>{{ item.priceDate | date: 'dd.MM.yyyy' }}</dd>
                    </div>
                  }
                </dl>
              </mat-card-content>
            </mat-card>
          </a>
        }
      </div>
    } @else {
      <p>Yükleniyor…</p>
    }
    <a matFab class="fab" routerLink="islem" aria-label="İşlem ekle">
      <mat-icon fontSet="material-symbols-outlined">add</mat-icon>
    </a>
  `,
  styles: `
    h1 {
      font: var(--mat-sys-headline-small);
      margin: 0 0 12px;
    }
    .summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
      margin-bottom: 16px;
    }
    .summary > div {
      display: flex;
      flex-direction: column;
    }
    .summary .total {
      grid-column: 1 / -1;
    }
    .summary strong {
      font: var(--mat-sys-headline-medium);
    }
    .label,
    dt {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-medium);
    }
    .warning {
      color: var(--mat-sys-on-surface-variant);
      margin: 0 0 12px;
    }
    .error {
      color: var(--mat-sys-error);
    }
    .cards {
      display: grid;
      gap: 12px;
    }
    .card-link {
      color: inherit;
      text-decoration: none;
    }
    dl {
      margin: 8px 0 0;
      display: grid;
      gap: 4px;
    }
    dl > div {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    dd {
      margin: 0;
      text-align: right;
    }
    .gain {
      color: #1b7f3b;
    }
    .loss {
      color: var(--mat-sys-error);
    }
    .fab {
      position: fixed;
      right: 16px;
      bottom: calc(80px + env(safe-area-inset-bottom));
      z-index: 1;
    }
    @media (min-width: 840px) {
      .cards {
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      }
      .fab {
        right: 24px;
        bottom: 24px;
      }
    }
  `,
})
export class Portfolio {
  protected readonly portfolio = signal<PortfolioData | null>(null);
  protected readonly error = signal(false);
  protected readonly typeLabels = ASSET_TYPE_LABELS;
  protected readonly formatDecimal = formatDecimal;
  protected readonly formatPct = formatPct;
  protected readonly gainClass = gainClass;

  constructor() {
    inject(InvestmentApi)
      .portfolio()
      .subscribe({
        next: (p) => this.portfolio.set(p),
        error: () => this.error.set(true),
      });
  }
}
