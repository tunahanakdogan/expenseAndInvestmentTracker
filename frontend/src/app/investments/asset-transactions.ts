import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AssetApi } from './asset-api';
import { formatDecimal, gainClass } from './format';
import { InvestmentApi } from './investment-api';
import { Asset, InvestmentTransaction } from './models';

/** Bir varlığın işlem geçmişi; işlem (ve işlemi kalmayan varlık) buradan silinir. */
@Component({
  selector: 'app-asset-transactions',
  imports: [DatePipe, MatButtonModule, MatIconModule, RouterLink],
  template: `
    <a class="back" routerLink="/yatirimlar">‹ Yatırımlar</a>
    @if (assetMissing()) {
      <h1>Varlık bulunamadı</h1>
    } @else {
      @if (asset(); as a) {
        <h1>{{ a.name }}</h1>
        <p class="subtitle">{{ a.symbol }}</p>
      }
      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
      @if (transactions(); as list) {
        @if (list.length === 0) {
          <p>Bu varlıkta işlem yok</p>
          <button matButton="outlined" type="button" (click)="deleteAsset()">Varlığı sil</button>
        }
        <ul>
          @for (tx of list; track tx.id) {
            <li data-testid="tx-row">
              <div class="main">
                <strong>{{ tx.type === 'BUY' ? 'Alış' : 'Satış' }}</strong>
                <span>{{ tx.tradeDate | date: 'dd.MM.yyyy' }}</span>
                <span>
                  {{ formatDecimal(tx.quantity) }} × {{ formatDecimal(tx.unitPrice) }} {{ tx.currency }}
                </span>
                @if (hasValue(tx.commission)) {
                  <span class="muted">Komisyon: {{ formatDecimal(tx.commission) }}</span>
                }
                @if (tx.fxRateTry) {
                  <span class="muted">Kur: {{ formatDecimal(tx.fxRateTry) }}</span>
                }
              </div>
              <button matIconButton type="button" aria-label="İşlemi sil" (click)="deleteTransaction(tx)">
                <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
              </button>
            </li>
          }
        </ul>
      }
      <a matButton="filled" class="add" routerLink="/yatirimlar/islem" [queryParams]="{ varlik: assetId }">
        İşlem ekle
      </a>
    }
  `,
  styles: `
    .back {
      color: var(--mat-sys-primary);
      text-decoration: none;
    }
    h1 {
      font: var(--mat-sys-headline-small);
      margin: 8px 0 0;
    }
    .subtitle,
    .muted {
      color: var(--mat-sys-on-surface-variant);
    }
    .subtitle {
      margin: 0 0 12px;
    }
    .error {
      color: var(--mat-sys-error);
    }
    ul {
      list-style: none;
      margin: 0 0 16px;
      padding: 0;
    }
    li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .main {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      gap: 2px 12px;
    }
    .add {
      height: 48px;
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
