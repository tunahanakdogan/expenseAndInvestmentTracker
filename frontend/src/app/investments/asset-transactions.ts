import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AssetApi } from './asset-api';
import { formatDecimal, gainClass } from './format';
import { InvestmentApi } from './investment-api';
import { Asset, InvestmentTransaction } from './models';

/** Bir varlığın işlem geçmişi; işlem (ve işlemi kalmayan varlık) buradan silinir. */
@Component({
  selector: 'app-asset-transactions',
  imports: [DatePipe, MatIconModule, RouterLink],
  template: `
    <header>
      <a class="app-icon-button" routerLink="/yatirimlar" aria-label="Geri">
        <mat-icon fontSet="material-symbols-outlined">arrow_back</mat-icon>
      </a>
      <div class="titles">
        @if (assetMissing()) {
          <h1>Varlık bulunamadı</h1>
        } @else if (asset(); as a) {
          <h1>{{ a.name }}</h1>
          <p class="subtitle">{{ a.symbol }}</p>
        }
      </div>
    </header>
    @if (!assetMissing()) {
      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
      @if (transactions(); as list) {
        @if (list.length === 0) {
          <p class="empty">Bu varlıkta işlem yok</p>
          <button class="outline" type="button" (click)="deleteAsset()">Varlığı sil</button>
        } @else {
          <ul class="app-card">
            @for (tx of list; track tx.id) {
              <li data-testid="tx-row">
                <div class="main">
                  <strong [class.sell]="tx.type === 'SELL'">{{
                    tx.type === 'BUY' ? 'Alış' : 'Satış'
                  }}</strong>
                  <span class="muted">{{ tx.tradeDate | date: 'dd.MM.yyyy' }}</span>
                  <span class="app-num amount">
                    {{ formatDecimal(tx.quantity) }} × {{ formatDecimal(tx.unitPrice) }}
                    {{ tx.currency }}
                  </span>
                  @if (hasValue(tx.commission)) {
                    <span class="muted">Komisyon: {{ formatDecimal(tx.commission) }}</span>
                  }
                  @if (tx.fxRateTry) {
                    <span class="muted">Kur: {{ formatDecimal(tx.fxRateTry) }}</span>
                  }
                </div>
                <button
                  type="button"
                  class="app-icon-button"
                  aria-label="İşlemi sil"
                  (click)="deleteTransaction(tx)"
                >
                  <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
                </button>
              </li>
            }
          </ul>
        }
      }
      <a
        class="app-primary add"
        routerLink="/yatirimlar/islem"
        [queryParams]="{ varlik: assetId }"
      >
        İşlem ekle
      </a>
    }
  `,
  styles: `
    :host {
      display: block;
      box-sizing: border-box;
      max-width: 640px;
      margin: 0 auto;
      padding: 18px 20px 24px;
    }
    header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    h1 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
    }
    .subtitle {
      margin: 2px 0 0;
      font-size: 12px;
      color: var(--app-muted);
    }
    .muted,
    .empty {
      color: var(--app-muted);
      font-size: 13px;
    }
    .error {
      color: var(--app-danger);
    }
    ul {
      list-style: none;
      margin: 0 0 16px;
      padding: 4px 14px;
    }
    li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 0;
      border-bottom: 1px solid var(--app-border);
      &:last-child {
        border-bottom: none;
      }
    }
    .main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px 12px;
    }
    .main strong {
      color: var(--app-accent-text);
    }
    .main strong.sell {
      color: var(--app-danger);
    }
    .amount {
      font-weight: 600;
    }
    .outline {
      min-height: 44px;
      padding: 0 16px;
      border-radius: var(--app-radius-button);
      border: 1px solid var(--app-border);
      background: var(--app-surface);
      color: var(--app-text);
      font: 600 15px var(--app-font);
      cursor: pointer;
      margin-bottom: 16px;
    }
    .add {
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }
  `,
})
export class AssetTransactions {
  private readonly assetApi = inject(AssetApi);
  private readonly investmentApi = inject(InvestmentApi);
  private readonly router = inject(Router);

  protected readonly assetId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  protected readonly asset = signal<Asset | null>(null);
  protected readonly assetMissing = signal(false);
  protected readonly transactions = signal<InvestmentTransaction[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly formatDecimal = formatDecimal;

  constructor() {
    this.assetApi.list().subscribe({
      next: (assets) => {
        const asset = assets.find((a) => a.id === this.assetId) ?? null;
        this.asset.set(asset);
        this.assetMissing.set(asset === null);
      },
      error: () => this.error.set('Varlık yüklenemedi'),
    });
    this.loadTransactions();
  }

  /** "0.0000" gibi sıfır değerler gösterilmez (string incelemesi; aritmetik yok). */
  protected hasValue(amount: string): boolean {
    return gainClass(amount) !== '';
  }

  protected deleteTransaction(tx: InvestmentTransaction): void {
    if (!window.confirm('Bu işlem silinsin mi?')) {
      return;
    }
    this.error.set(null);
    this.investmentApi.delete(tx.id).subscribe({
      next: () => this.loadTransactions(),
      error: (err: HttpErrorResponse) => this.error.set(err.error?.detail ?? 'İşlem silinemedi'),
    });
  }

  protected deleteAsset(): void {
    if (!window.confirm('Bu varlık silinsin mi?')) {
      return;
    }
    this.error.set(null);
    this.assetApi.delete(this.assetId).subscribe({
      next: () => this.router.navigateByUrl('/yatirimlar'),
      error: (err: HttpErrorResponse) => this.error.set(err.error?.detail ?? 'Varlık silinemedi'),
    });
  }

  private loadTransactions(): void {
    this.investmentApi.transactions(this.assetId).subscribe({
      next: (list) => this.transactions.set(list),
      // 404: varlık yok/başkasının; başlık zaten "Varlık bulunamadı" gösterir.
      error: (err: HttpErrorResponse) => {
        if (err.status !== 404) {
          this.error.set('İşlemler yüklenemedi');
        }
      },
    });
  }
}
