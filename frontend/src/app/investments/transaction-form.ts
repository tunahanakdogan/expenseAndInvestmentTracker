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
import { MatIconModule } from '@angular/material/icon';
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
import {
  ASSET_TYPE_LABELS,
  Asset,
  AssetType,
  Instrument,
  SHORT_TYPE_LABELS,
  TransactionType,
} from './models';

const NEW_ASSET = 'new';

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
    MatIconModule,
    RouterLink,
  ],
  template: `
    <header>
      <a class="app-icon-button" routerLink="/yatirimlar" aria-label="Geri">
        <mat-icon fontSet="material-symbols-outlined">arrow_back</mat-icon>
      </a>
      <h1>İşlem ekle</h1>
    </header>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <div class="segmented" role="group" aria-label="İşlem türü">
        <button
          type="button"
          data-type="BUY"
          [attr.aria-pressed]="form.controls.type.value === 'BUY'"
          (click)="form.controls.type.setValue('BUY')"
        >
          Alış
        </button>
        <button
          type="button"
          data-type="SELL"
          [attr.aria-pressed]="form.controls.type.value === 'SELL'"
          (click)="form.controls.type.setValue('SELL')"
        >
          Satış
        </button>
      </div>

      <label class="field">
        <span class="app-label">Varlık</span>
        <select formControlName="assetId">
          <option value=""></option>
          @for (a of assets(); track a.id) {
            <option [value]="'' + a.id">{{ a.name }} ({{ a.symbol }})</option>
          }
          <option value="new">Yeni varlık…</option>
        </select>
        @if (form.controls.assetId.touched && form.controls.assetId.hasError('required')) {
          <span class="err">Varlık seç</span>
        }
      </label>

      @if (selection().isNew) {
        <div class="field search">
          <label class="app-label" for="varlik-ara">Ara: ad veya kod</label>
          <div class="search-box">
            <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">search</mat-icon>
            <input
              id="varlik-ara"
              [formControl]="searchControl"
              [matAutocomplete]="instrumentList"
              aria-label="Varlık ara"
              autocomplete="off"
              placeholder="ör. türk hava, apple, AFT, dolar"
            />
          </div>
          <mat-autocomplete
            #instrumentList="matAutocomplete"
            class="instrument-panel"
            (optionSelected)="pickInstrument($event.option.value)"
          >
            @for (i of instruments(); track i.type + i.symbol) {
              <mat-option [value]="i">
                <span class="option">
                  <span class="option-badge app-num">{{ i.symbol.slice(0, 3) }}</span>
                  <span class="option-text">
                    <span class="option-name">{{ i.name }}</span>
                    <span class="option-meta">{{ i.symbol }}</span>
                  </span>
                  <span class="option-type">{{ shortTypeLabels[i.type] }}</span>
                </span>
              </mat-option>
            }
          </mat-autocomplete>
          <span class="hint">Bulamazsan aşağıya elle yazabilirsin</span>
        </div>
        <div class="grid">
          <label class="field">
            <span class="app-label">Tür</span>
            <select formControlName="newType">
              @for (t of assetTypes; track t) {
                <option [value]="t">{{ typeLabels[t] }}</option>
              }
            </select>
          </label>
          <label class="field">
            <span class="app-label">Sembol</span>
            <input formControlName="newSymbol" autocapitalize="characters" autocomplete="off" />
            @if (form.controls.newSymbol.touched && form.controls.newSymbol.hasError('required')) {
              <span class="err">Sembol gerekli</span>
            }
          </label>
        </div>
        <label class="field">
          <span class="app-label">Ad</span>
          <input formControlName="newName" autocomplete="off" />
          @if (form.controls.newName.touched && form.controls.newName.hasError('required')) {
            <span class="err">Ad gerekli</span>
          }
        </label>
      }

      <div class="grid">
        <label class="field">
          <span class="app-label">Tarih</span>
          <input class="app-num" type="date" formControlName="tradeDate" />
          @if (form.controls.tradeDate.touched && form.controls.tradeDate.hasError('required')) {
            <span class="err">Tarih gerekli</span>
          }
        </label>

        <label class="field">
          <span class="app-label">Adet</span>
          <input
            class="app-num"
            formControlName="quantity"
            inputmode="decimal"
            autocomplete="off"
          />
          @if (numberError(form.controls.quantity, 'Adet gerekli'); as message) {
            <span class="err">{{ message }}</span>
          }
        </label>

        <label class="field">
          <span class="app-label">{{
            selection().currency ? 'Birim fiyat (' + selection().currency + ')' : 'Birim fiyat'
          }}</span>
          <input
            class="app-num"
            formControlName="unitPrice"
            inputmode="decimal"
            autocomplete="off"
          />
          @if (selection().type === 'CURRENCY') {
            <span class="hint">1 birim dövizin TL karşılığı</span>
          }
          @if (numberError(form.controls.unitPrice, 'Birim fiyat gerekli'); as message) {
            <span class="err">{{ message }}</span>
          }
        </label>

        <label class="field">
          <span class="app-label">Komisyon</span>
          <input
            class="app-num"
            formControlName="commission"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0,00"
          />
          @if (numberError(form.controls.commission, ''); as message) {
            <span class="err">{{ message }}</span>
          }
        </label>

        @if (selection().type === 'US_STOCK') {
          <label class="field">
            <span class="app-label">USD/TRY kuru</span>
            <input
              class="app-num"
              formControlName="fxRate"
              inputmode="decimal"
              autocomplete="off"
            />
            @if (numberError(form.controls.fxRate, 'Kur gerekli'); as message) {
              <span class="err">{{ message }}</span>
            }
          </label>
        }
      </div>

      @if (error(); as message) {
        <p class="err" role="alert">{{ message }}</p>
      }
      <button class="app-primary" type="submit" [disabled]="saving()">
        {{ saving() ? 'Kaydediliyor…' : 'Kaydet' }}
      </button>
    </form>
  `,
  styles: `
    :host {
      display: block;
      box-sizing: border-box;
      max-width: 480px;
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
    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .segmented {
      display: flex;
      gap: 4px;
      padding: 4px;
      border-radius: 16px;
      background: var(--app-surface);
      border: 1px solid var(--app-border);
    }
    .segmented button {
      flex: 1;
      height: 44px;
      border: none;
      border-radius: 12px;
      background: transparent;
      color: var(--app-muted);
      font: 500 15px var(--app-font);
      cursor: pointer;
      &[aria-pressed='true'] {
        background: var(--app-accent);
        color: var(--app-accent-ink);
        font-weight: 700;
      }
      &:focus-visible {
        outline: 3px solid var(--app-accent-text);
        outline-offset: 2px;
      }
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }
    .field input,
    .field select,
    .search-box {
      box-sizing: border-box;
      height: 52px;
      width: 100%;
      padding: 0 14px;
      border-radius: var(--app-radius-input);
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      color: var(--app-text);
      font: 500 16px var(--app-font);
      outline: none;
    }
    .field input.app-num {
      font-family: var(--app-font-num);
    }
    .field input:focus-visible,
    .field select:focus-visible,
    .search-box:focus-within {
      border-color: var(--app-accent-text);
      outline: 2px solid var(--app-accent-text);
      outline-offset: 1px;
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 10px;
      border-color: var(--app-accent-text);
    }
    .search-box mat-icon {
      color: var(--app-muted);
      flex: none;
    }
    .search-box input {
      flex: 1;
      min-width: 0;
      height: 100%;
      padding: 0;
      border: none;
      background: transparent;
      outline: none;
    }
    .search-box input:focus-visible {
      outline: none;
    }
    .hint {
      font-size: 12px;
      color: var(--app-muted);
    }
    .err {
      font-size: 12px;
      color: var(--app-danger);
      margin: 0;
    }
    .app-primary {
      margin-top: 8px;
    }
    ::ng-deep .instrument-panel {
      background: var(--app-surface-2) !important;
      border: 1px solid var(--app-border);
      border-radius: var(--app-radius-input) !important;
      padding: 4px;
    }
    .option {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 0;
    }
    .option-badge {
      width: 36px;
      height: 36px;
      flex: none;
      border-radius: 10px;
      background: var(--app-border);
      color: var(--app-accent-text);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 11px;
    }
    .option-text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .option-name {
      font-size: 14px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .option-meta {
      font-size: 12px;
      color: var(--app-muted);
    }
    .option-type {
      height: 22px;
      padding: 0 8px;
      border-radius: 11px;
      background: var(--app-border);
      color: var(--app-text);
      font-size: 11px;
      display: flex;
      align-items: center;
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

  /** Hata yalnız alana dokunulduktan (ya da gönderim denendikten) sonra gösterilir. */
  protected numberError(control: AbstractControl, requiredMessage: string): string | null {
    if (!control.touched) {
      return null;
    }
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
