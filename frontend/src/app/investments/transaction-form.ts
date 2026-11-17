import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { AssetApi } from './asset-api';
import { formatDecimal, parseDecimal, todayIso } from './format';
import { InstrumentApi } from './instrument-api';
import { InvestmentApi } from './investment-api';
import { ASSET_TYPE_LABELS, Asset, AssetType, Instrument, TransactionType } from './models';

const NEW_ASSET = 'new';

/** Arama sonucundaki kısa tür etiketi. */
const SHORT_TYPE_LABELS: Record<AssetType, string> = {
  BIST_STOCK: 'BIST',
  US_STOCK: 'ABD',
  FUND: 'Fon',
  CURRENCY: 'Döviz',
  GOLD: 'Altın',
};

/** Boş değer geçerli sayılır (zorunluluk ayrı doğrulanır); ondalık ayırıcı yalnız virgül. */
function decimal(maxFraction: number, positive: boolean): ValidatorFn {
  return (control: AbstractControl<string>) => {
    if (control.value.trim() === '') {
      return null;
    }
    const parsed = parseDecimal(control.value, maxFraction);
    if (parsed === null) {
      return { decimal: true };
    }
    return positive && !/[1-9]/.test(parsed) ? { positive: true } : null;
  };
}

/** Alış/satış girişi; istenirse aynı adımda yeni varlık da açar. Sayılar string olarak gider, hesap backend'de. */
@Component({
  selector: 'app-transaction-form',
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    RouterLink,
  ],
  template: `
    <h1>İşlem ekle</h1>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-form-field>
        <mat-label>Varlık</mat-label>
        <select matNativeControl formControlName="assetId">
          <option value=""></option>
          @for (a of assets(); track a.id) {
            <option [value]="'' + a.id">{{ a.name }} ({{ a.symbol }})</option>
          }
          <option value="new">Yeni varlık…</option>
        </select>
        @if (form.controls.assetId.hasError('required')) {
          <mat-error>Varlık seç</mat-error>
        }
      </mat-form-field>

      @if (selection().isNew) {
        <mat-form-field>
          <mat-label>Ara: ad veya kod</mat-label>
          <input
            matInput
            [formControl]="searchControl"
            [matAutocomplete]="instrumentList"
            aria-label="Varlık ara"
            autocomplete="off"
            placeholder="ör. türk hava, apple, AFT, dolar"
          />
          <mat-icon matSuffix fontSet="material-symbols-outlined">search</mat-icon>
          <mat-autocomplete
            #instrumentList="matAutocomplete"
            (optionSelected)="pickInstrument($event.option.value)"
          >
            @for (i of instruments(); track i.type + i.symbol) {
              <mat-option [value]="i">
                <span class="option-name">{{ i.name }}</span>
                <span class="option-meta">{{ i.symbol }} · {{ shortTypeLabels[i.type] }}</span>
              </mat-option>
            }
          </mat-autocomplete>
          <mat-hint>Bulamazsan aşağıya elle yazabilirsin</mat-hint>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Tür</mat-label>
          <select matNativeControl formControlName="newType">
            @for (t of assetTypes; track t) {
              <option [value]="t">{{ typeLabels[t] }}</option>
            }
          </select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Sembol</mat-label>
          <input
            matInput
            formControlName="newSymbol"
            autocapitalize="characters"
            autocomplete="off"
          />
          @if (form.controls.newSymbol.hasError('required')) {
            <mat-error>Sembol gerekli</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>Ad</mat-label>
          <input matInput formControlName="newName" autocomplete="off" />
          @if (form.controls.newName.hasError('required')) {
            <mat-error>Ad gerekli</mat-error>
          }
        </mat-form-field>
      }

      <mat-button-toggle-group formControlName="type" aria-label="İşlem türü">
        <mat-button-toggle value="BUY">Alış</mat-button-toggle>
        <mat-button-toggle value="SELL">Satış</mat-button-toggle>
      </mat-button-toggle-group>

      <mat-form-field>
        <mat-label>Tarih</mat-label>
        <input matInput type="date" formControlName="tradeDate" />
        @if (form.controls.tradeDate.hasError('required')) {
          <mat-error>Tarih gerekli</mat-error>
        }
      </mat-form-field>

      <mat-form-field>
        <mat-label>Adet</mat-label>
        <input matInput formControlName="quantity" inputmode="decimal" autocomplete="off" />
        @if (numberError(form.controls.quantity, 'Adet gerekli'); as message) {
          <mat-error>{{ message }}</mat-error>
        }
      </mat-form-field>

      <mat-form-field>
        <mat-label>{{
          selection().currency ? 'Birim fiyat (' + selection().currency + ')' : 'Birim fiyat'
        }}</mat-label>
        <input matInput formControlName="unitPrice" inputmode="decimal" autocomplete="off" />
        @if (selection().type === 'CURRENCY') {
          <mat-hint>1 birim dövizin TL karşılığı</mat-hint>
        }
        @if (numberError(form.controls.unitPrice, 'Birim fiyat gerekli'); as message) {
          <mat-error>{{ message }}</mat-error>
        }
      </mat-form-field>

      <mat-form-field>
        <mat-label>Komisyon</mat-label>
        <input matInput formControlName="commission" inputmode="decimal" autocomplete="off" />
        @if (numberError(form.controls.commission, ''); as message) {
          <mat-error>{{ message }}</mat-error>
        }
      </mat-form-field>

      @if (selection().type === 'US_STOCK') {
        <mat-form-field>
          <mat-label>USD/TRY kuru</mat-label>
          <input matInput formControlName="fxRate" inputmode="decimal" autocomplete="off" />
          @if (numberError(form.controls.fxRate, 'Kur gerekli'); as message) {
            <mat-error>{{ message }}</mat-error>
          }
        </mat-form-field>
      }

      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
      <button matButton="filled" type="submit" [disabled]="saving()">
        {{ saving() ? 'Kaydediliyor…' : 'Kaydet' }}
      </button>
      <a matButton routerLink="/yatirimlar">Vazgeç</a>
    </form>
  `,
  styles: `
    h1 {
      font: var(--mat-sys-headline-small);
      margin: 0 0 12px;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-width: 480px;
    }
    mat-button-toggle-group {
      margin-bottom: 16px;
    }
    mat-button-toggle {
      flex: 1;
    }
    button[type='submit'] {
      height: 48px;
    }
    .error {
      color: var(--mat-sys-error);
      margin: 0 0 8px;
    }
    .option-name {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .option-meta {
      display: block;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-small);
    }
  `,
})
export class TransactionForm {
  private readonly assetApi = inject(AssetApi);
  private readonly investmentApi = inject(InvestmentApi);
  private readonly router = inject(Router);

  private readonly instrumentApi = inject(InstrumentApi);

  protected readonly typeLabels = ASSET_TYPE_LABELS;
  protected readonly shortTypeLabels = SHORT_TYPE_LABELS;
  protected readonly assetTypes = Object.keys(ASSET_TYPE_LABELS) as AssetType[];
  /** Formun parçası değil: yalnız öneri aramak için; seçim aşağıdaki alanları doldurur. */
  protected readonly searchControl = new FormControl<string | Instrument>('', { nonNullable: true });
  protected readonly instruments = signal<Instrument[]>([]);

  protected readonly form = inject(NonNullableFormBuilder).group({
    assetId: [
      inject(ActivatedRoute).snapshot.queryParamMap.get('varlik') ?? '',
      Validators.required,
    ],
    newType: ['BIST_STOCK' as AssetType],
    newSymbol: ['', Validators.required],
    newName: ['', Validators.required],
    type: ['BUY' as TransactionType],
    tradeDate: [todayIso(), Validators.required],
    quantity: ['', [Validators.required, decimal(8, true)]],
    unitPrice: ['', [Validators.required, decimal(8, true)]],
    commission: ['', decimal(4, false)],
    fxRate: ['', [Validators.required, decimal(8, true)]],
  });

  protected readonly assets = signal<Asset[]>([]);
  /** Seçili (ya da açılacak) varlığın türü ve para birimi; koşullu alanları belirler. */
  protected readonly selection = signal<{
    isNew: boolean;
    type: AssetType | null;
    currency: string | null;
  }>({
    isNew: false,
    type: null,
    currency: null,
  });
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly rateRequests = new Subject<string>();
  private requestedRateDate: string | null = null;

  constructor() {
    const { assetId, newType, tradeDate, fxRate } = this.form.controls;
    assetId.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.syncSelection());
    newType.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.syncSelection());
    tradeDate.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.prefillRate());

    this.rateRequests
      .pipe(
        switchMap((date) => this.investmentApi.usdRate(date).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      .subscribe((rate) => {
        // Kullanıcı kuru elle değiştirdiyse dokunma.
        if (rate !== null && fxRate.pristine) {
          fxRate.setValue(formatDecimal(rate));
        }
      });

    this.searchControl.valueChanges
      .pipe(
        // Seçimde kontrolün değeri Instrument olur; yalnız yazılan metinle ara.
        filter((value): value is string => typeof value === 'string'),
        map((text) => text.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) =>
          q.length < 2 ? of([]) : this.instrumentApi.search(q).pipe(catchError(() => of([]))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((list) => this.instruments.set(list));

    this.syncSelection();
    this.assetApi.list().subscribe({
      next: (assets) => {
        this.assets.set(assets);
        this.syncSelection();
      },
      error: () => this.error.set('Varlıklar yüklenemedi'),
    });
  }

  protected pickInstrument(instrument: Instrument): void {
    const { newType, newSymbol, newName } = this.form.controls;
    newType.setValue(instrument.type);
    newSymbol.setValue(instrument.symbol);
    newName.setValue(instrument.name);
    this.searchControl.setValue(instrument.name, { emitEvent: false });
  }

  protected numberError(control: AbstractControl, requiredMessage: string): string | null {
    if (control.hasError('required')) {
      return requiredMessage;
    }
    if (control.hasError('decimal')) {
      return 'Geçersiz sayı; ondalık için virgül kullan';
    }
    return control.hasError('positive') ? 'Sıfırdan büyük olmalı' : null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const usStock = this.selection().type === 'US_STOCK';
    this.saving.set(true);
    this.error.set(null);

    this.resolveAssetId()
      .pipe(
        switchMap((assetId) =>
          this.investmentApi.create({
            assetId,
            type: v.type,
            tradeDate: v.tradeDate,
            quantity: parseDecimal(v.quantity, 8)!,
            unitPrice: parseDecimal(v.unitPrice, 8)!,
            commission: v.commission.trim() === '' ? '0' : parseDecimal(v.commission, 4)!,
            fxRateTry: usStock ? parseDecimal(v.fxRate, 8) : null,
          }),
        ),
      )
      .subscribe({
        next: () => this.router.navigateByUrl('/yatirimlar'),
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.error.set(err.error?.detail ?? 'Kaydedilemedi, tekrar dene');
        },
      });
  }

  /**
   * Yeni varlık önce oluşturulur ve seçili hale gelir; işlem reddedilirse ikinci denemede
   * varlık yeniden oluşturulmaya çalışılmaz.
   */
  private resolveAssetId(): Observable<number> {
    const { assetId, newType, newSymbol, newName } = this.form.getRawValue();
    if (assetId !== NEW_ASSET) {
      return of(Number(assetId));
    }
    return this.assetApi
      .create({ type: newType, symbol: newSymbol.trim(), name: newName.trim() })
      .pipe(
        tap((asset) => {
          this.assets.update((list) => [...list, asset]);
          this.form.controls.assetId.setValue(String(asset.id));
        }),
        map((asset) => asset.id),
      );
  }

  private syncSelection(): void {
    const { assetId, newType, newSymbol, newName, fxRate } = this.form.controls;
    const isNew = assetId.value === NEW_ASSET;
    const asset = this.assets().find((a) => String(a.id) === assetId.value);
    const type = isNew ? newType.value : (asset?.type ?? null);
    // Yeni varlıkta para birimini backend belirler; burada yalnız etiket için aynı kural.
    const currency = isNew ? (type === 'US_STOCK' ? 'USD' : 'TRY') : (asset?.currency ?? null);
    this.selection.set({ isNew, type, currency });

    // Görünmeyen alanlar devre dışı: doğrulamaya katılmazlar.
    for (const [control, enabled] of [
      [newSymbol, isNew],
      [newName, isNew],
      [fxRate, type === 'US_STOCK'],
    ] as const) {
      if (enabled !== control.enabled) {
        control[enabled ? 'enable' : 'disable']({ emitEvent: false });
      }
    }
    this.prefillRate();
  }

  /** ABD hissesinde işlem tarihinin kurunu ister; aynı tarih için tekrar istemez. */
  private prefillRate(): void {
    const date = this.form.controls.tradeDate.value;
    if (this.selection().type !== 'US_STOCK' || date === '') {
      this.requestedRateDate = null;
      return;
    }
    if (date !== this.requestedRateDate) {
      this.requestedRateDate = date;
      this.rateRequests.next(date);
    }
  }
}
