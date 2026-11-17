import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Asset } from './models';
import { TransactionForm } from './transaction-form';

const ASSETS: Asset[] = [
  { id: 1, type: 'BIST_STOCK', symbol: 'THYAO', name: 'Türk Hava Yolları', currency: 'TRY' },
  { id: 2, type: 'US_STOCK', symbol: 'AAPL', name: 'Apple', currency: 'USD' },
];
const TX_URL = '/api/investments/transactions';

describe('TransactionForm', () => {
  let fixture: ComponentFixture<TransactionForm>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let navigate: ReturnType<typeof vi.spyOn>;

  async function setup(queryParams: Record<string, string> = {}) {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-15T09:00:00Z'));
    await TestBed.configureTestingModule({
      imports: [TransactionForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(TransactionForm);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne('/api/assets').flush(ASSETS);
    await fixture.whenStable();
  }

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function field<T extends HTMLElement = HTMLInputElement>(name: string): T | null {
    return el.querySelector<T>(`[formControlName=${name}]`);
  }

  function type(name: string, value: string) {
    const input = field(name)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function select(name: string, value: string) {
    const control = field<HTMLSelectElement>(name)!;
    control.value = value;
    control.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function submit() {
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
  }

  function expectRate(date: string) {
    return http.expectOne(
      (r) =>
        r.url === '/api/pricing/rate' &&
        r.params.get('currency') === 'USD' &&
        r.params.get('date') === date,
    );
  }

  async function flushRate(date: string, rateTry: string) {
    expectRate(date).flush({ currency: 'USD', date, rateTry });
    await fixture.whenStable();
  }

  it('boş formda istek atmaz ve zorunlu alan hatalarını gösterir', async () => {
    await setup();
    await submit();

    http.expectNone(TX_URL);
    expect(el.textContent).toContain('Varlık seç');
    expect(el.textContent).toContain('Adet gerekli');
    expect(el.textContent).toContain('Birim fiyat gerekli');
  });

  it('TL varlıkta işlemi API biçiminde gönderir', async () => {
    await setup();
    await select('assetId', '1');
    type('quantity', '10,5');
    type('unitPrice', '100,25');

    expect(field('fxRate')).toBeNull();
    http.expectNone((r) => r.url === '/api/pricing/rate');
    expect(el.textContent).toContain('Birim fiyat (TRY)');

    await submit();
    const req = http.expectOne(TX_URL);
    expect(req.request.body).toEqual({
      assetId: 1,
      type: 'BUY',
      tradeDate: '2026-11-15',
      quantity: '10.5',
      unitPrice: '100.25',
      commission: '0',
      fxRateTry: null,
    });
    req.flush({});

    expect(navigate).toHaveBeenCalledWith('/yatirimlar');
  });

  it('satış seçilince type SELL gider', async () => {
    await setup();
    await select('assetId', '1');
    el.querySelector<HTMLButtonElement>('mat-button-toggle[value=SELL] button')!.click();
    type('quantity', '1');
    type('unitPrice', '100');
    await submit();

    const req = http.expectOne(TX_URL);
    expect(req.request.body.type).toBe('SELL');
    req.flush({});
  });

  it('ABD hissesinde kuru ön doldurur ve gönderir', async () => {
    await setup();
    await select('assetId', '2');
    await flushRate('2026-11-15', '34.12340000');

    expect(field('fxRate')!.value).toBe('34,1234');
    expect(el.textContent).toContain('Birim fiyat (USD)');

    type('quantity', '2');
    type('unitPrice', '200');
    type('commission', '1,5');
    await submit();

    const req = http.expectOne(TX_URL);
    expect(req.request.body).toEqual({
      assetId: 2,
      type: 'BUY',
      tradeDate: '2026-11-15',
      quantity: '2',
      unitPrice: '200',
      commission: '1.5',
      fxRateTry: '34.1234',
    });
    req.flush({});
  });

  it('kur bulunamazsa alan boş kalır ve kur zorunludur', async () => {
    await setup();
    await select('assetId', '2');
    expectRate('2026-11-15').flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(field('fxRate')!.value).toBe('');

    type('quantity', '2');
    type('unitPrice', '200');
    await submit();

    expect(el.textContent).toContain('Kur gerekli');
    http.expectNone(TX_URL);
  });

  it('elle girilen kur tarih değişince ezilmez', async () => {
    await setup();
    await select('assetId', '2');
    await flushRate('2026-11-15', '34.12340000');

    type('fxRate', '35');
    type('tradeDate', '2026-11-10');
    await flushRate('2026-11-10', '33.00000000');

    expect(field('fxRate')!.value).toBe('35');
  });

  it('elle dokunulmamış kur tarih değişince yenilenir', async () => {
    await setup();
    await select('assetId', '2');
    await flushRate('2026-11-15', '34.12340000');

    type('tradeDate', '2026-11-10');
    await flushRate('2026-11-10', '33.00000000');

    expect(field('fxRate')!.value).toBe('33');
  });

  it('noktalı ondalığı reddeder', async () => {
    await setup();
    await select('assetId', '1');
    type('quantity', '1.234');
    type('unitPrice', '100');
    await submit();

    expect(el.textContent).toContain('Geçersiz sayı; ondalık için virgül kullan');
    http.expectNone(TX_URL);
  });

  it('8 haneden fazla ondalığı reddeder', async () => {
    await setup();
    await select('assetId', '1');
    type('quantity', '0,123456789');
    type('unitPrice', '100');
    await submit();

    expect(el.textContent).toContain('Geçersiz sayı; ondalık için virgül kullan');
    http.expectNone(TX_URL);
  });

  it('sıfır adedi reddeder', async () => {
    await setup();
    await select('assetId', '1');
    type('quantity', '0');
    type('unitPrice', '100');
    await submit();

    expect(el.textContent).toContain('Sıfırdan büyük olmalı');
    http.expectNone(TX_URL);
  });

  it('yeni varlık önce oluşturulur sonra işlem kaydedilir', async () => {
    await setup();
    await select('assetId', 'new');
    await select('newType', 'BIST_STOCK');
    type('newSymbol', 'garan');
    type('newName', 'Garanti');
    type('quantity', '1');
    type('unitPrice', '50');
    await submit();

    const assetReq = http.expectOne('/api/assets');
    expect(assetReq.request.method).toBe('POST');
    expect(assetReq.request.body).toEqual({ type: 'BIST_STOCK', symbol: 'garan', name: 'Garanti' });
    assetReq.flush({
      id: 7,
      type: 'BIST_STOCK',
      symbol: 'GARAN',
      name: 'Garanti',
      currency: 'TRY',
    });

    const txReq = http.expectOne(TX_URL);
    expect(txReq.request.body.assetId).toBe(7);
    txReq.flush({});

    expect(navigate).toHaveBeenCalledWith('/yatirimlar');
  });

  it('yeni varlık oluşup işlem reddedilirse ikinci denemede varlık yeniden oluşturulmaz', async () => {
    await setup();
    await select('assetId', 'new');
    type('newSymbol', 'garan');
    type('newName', 'Garanti');
    el.querySelector<HTMLButtonElement>('mat-button-toggle[value=SELL] button')!.click();
    type('quantity', '1');
    type('unitPrice', '50');
    await submit();

    http
      .expectOne('/api/assets')
      .flush({ id: 7, type: 'BIST_STOCK', symbol: 'GARAN', name: 'Garanti', currency: 'TRY' });
    http
      .expectOne(TX_URL)
      .flush(
        { detail: 'Eldeki adetten fazla satılamaz' },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    await fixture.whenStable();

    expect(field<HTMLSelectElement>('assetId')!.value).toBe('7');
    expect(field('newSymbol')).toBeNull();

    await submit();
    http.expectNone('/api/assets');
    const retry = http.expectOne(TX_URL);
    expect(retry.request.body.assetId).toBe(7);
    retry.flush({});
  });

  describe('varlık arama', () => {
    function searchInput(): HTMLInputElement {
      return el.querySelector<HTMLInputElement>('input[aria-label="Varlık ara"]')!;
    }

    async function search(text: string) {
      const input = searchInput();
      input.focus();
      input.value = text;
      input.dispatchEvent(new Event('input'));
      await vi.advanceTimersByTimeAsync(300);
    }

    function expectSearch(q: string) {
      return http.expectOne((r) => r.url === '/api/pricing/instruments' && r.params.get('q') === q);
    }

    /** Sahte zamanlayıcı seçimden sonra: whenStable gerçek zamanlayıcıyla çalışmalı; debounce setInterval kullanır. */
    async function startNewAsset() {
      await select('assetId', 'new');
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
      vi.setSystemTime(new Date('2026-11-15T09:00:00Z'));
    }

    it('seçilen sonuç tür, sembol ve adı doldurur', async () => {
      await setup();
      await startNewAsset();
      await search('türk hava');

      expectSearch('türk hava').flush([
        { type: 'BIST_STOCK', symbol: 'THYAO', name: 'Türk Hava Yolları', exchange: 'IST' },
        { type: 'US_STOCK', symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
      ]);
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(0);

      const options = Array.from(document.querySelectorAll<HTMLElement>('mat-option'));
      expect(options.map((o) => o.textContent)).toEqual([
        expect.stringContaining('THYAO'),
        expect.stringContaining('AAPL'),
      ]);
      expect(options[1].textContent).toContain('ABD');

      options[1].click();
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(0);

      expect(field<HTMLSelectElement>('newType')!.value).toBe('US_STOCK');
      expect(field('newSymbol')!.value).toBe('AAPL');
      expect(field('newName')!.value).toBe('Apple Inc.');
      // ABD hissesi seçilince kur alanı açılır ve kur istenir.
      expectRate('2026-11-15').flush({ currency: 'USD', date: '2026-11-15', rateTry: '50.4199' });
    });

    it('yazmaya devam ederken yalnız son metin için istek atar', async () => {
      await setup();
      await startNewAsset();
      const input = searchInput();
      input.focus();
      for (const text of ['as', 'ase', 'asel']) {
        input.value = text;
        input.dispatchEvent(new Event('input'));
        await vi.advanceTimersByTimeAsync(100);
      }
      await vi.advanceTimersByTimeAsync(300);

      expectSearch('asel').flush([]);
    });

    it('2 karakterden kısa metinde istek atmaz', async () => {
      await setup();
      await startNewAsset();
      await search('a');

      http.expectNone((r) => r.url === '/api/pricing/instruments');
    });

    it('arama hata verirse elle giriş çalışmaya devam eder', async () => {
      await setup();
      await startNewAsset();
      await search('garanti');
      expectSearch('garanti').flush(null, { status: 500, statusText: 'Error' });
      fixture.detectChanges();

      expect(document.querySelectorAll('mat-option')).toHaveLength(0);
      type('newSymbol', 'GARAN');
      expect(field('newSymbol')!.value).toBe('GARAN');
    });
  });

  it('yeni varlıkta sembol ve ad zorunludur', async () => {
    await setup();
    await select('assetId', 'new');
    type('quantity', '1');
    type('unitPrice', '50');
    await submit();

    expect(el.textContent).toContain('Sembol gerekli');
    expect(el.textContent).toContain('Ad gerekli');
    http.expectNone('/api/assets');
    http.expectNone(TX_URL);
  });

  it('yeni ABD hissesinde kur alanı görünür ve ön dolar', async () => {
    await setup();
    await select('assetId', 'new');
    expect(field('fxRate')).toBeNull();

    await select('newType', 'US_STOCK');
    await flushRate('2026-11-15', '34.12340000');

    expect(field('fxRate')!.value).toBe('34,1234');
  });

  it('sunucu 422 dönerse mesajı gösterir', async () => {
    await setup();
    await select('assetId', '1');
    el.querySelector<HTMLButtonElement>('mat-button-toggle[value=SELL] button')!.click();
    type('quantity', '100');
    type('unitPrice', '50');
    await submit();

    http
      .expectOne(TX_URL)
      .flush(
        { detail: 'Eldeki adetten fazla satılamaz' },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain(
      'Eldeki adetten fazla satılamaz',
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(el.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
  });

  it('varlik sorgu parametresi varlığı ön seçer', async () => {
    await setup({ varlik: '1' });

    expect(field<HTMLSelectElement>('assetId')!.value).toBe('1');
  });
});
