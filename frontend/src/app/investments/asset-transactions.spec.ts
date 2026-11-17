import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeTr from '@angular/common/locales/tr';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AssetTransactions } from './asset-transactions';
import { Asset, InvestmentTransaction } from './models';

registerLocaleData(localeTr);

const ASSET: Asset = { id: 5, type: 'US_STOCK', symbol: 'AAPL', name: 'Apple', currency: 'USD' };
const TRANSACTIONS: InvestmentTransaction[] = [
  {
    id: 11,
    assetId: 5,
    type: 'SELL',
    tradeDate: '2026-02-02',
    quantity: '1.00000000',
    unitPrice: '300.00000000',
    commission: '2.0000',
    currency: 'USD',
    fxRateTry: '40.00000000',
  },
  {
    id: 10,
    assetId: 5,
    type: 'BUY',
    tradeDate: '2026-01-05',
    quantity: '2.00000000',
    unitPrice: '200.00000000',
    commission: '0.0000',
    currency: 'USD',
    fxRateTry: '30.00000000',
  },
];

describe('AssetTransactions', () => {
  let fixture: ComponentFixture<AssetTransactions>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let confirm: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    confirm = vi.spyOn(window, 'confirm');
    await TestBed.configureTestingModule({
      imports: [AssetTransactions],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'tr-TR' },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AssetTransactions);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  function expectTransactions() {
    return http.expectOne(
      (r) => r.url === '/api/investments/transactions' && r.params.get('assetId') === '5',
    );
  }

  async function load(transactions: InvestmentTransaction[]) {
    http.expectOne('/api/assets').flush([ASSET]);
    expectTransactions().flush(transactions);
    await fixture.whenStable();
  }

  function rows(): HTMLElement[] {
    return Array.from(el.querySelectorAll<HTMLElement>('[data-testid=tx-row]'));
  }

  async function clickDelete(row: HTMLElement) {
    row.querySelector<HTMLButtonElement>('button[aria-label="İşlemi sil"]')!.click();
    await fixture.whenStable();
  }

  it('varlık adını ve işlemleri gösterir', async () => {
    await load(TRANSACTIONS);

    expect(el.textContent).toContain('Apple');
    expect(el.textContent).toContain('AAPL');
    expect(rows()).toHaveLength(2);
    for (const text of ['Satış', '02.02.2026', '300', 'Komisyon: 2', 'Kur: 40']) {
      expect(rows()[0].textContent).toContain(text);
    }
    expect(rows()[1].textContent).toContain('Alış');
    expect(rows()[1].textContent).toContain('05.01.2026');
    expect(rows()[1].textContent).not.toContain('Komisyon');
  });

  it('onaylanınca işlemi siler ve listeyi yeniler', async () => {
    confirm.mockReturnValue(true);
    await load(TRANSACTIONS);

    await clickDelete(rows()[0]);

    const req = http.expectOne('/api/investments/transactions/11');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    expectTransactions().flush([TRANSACTIONS[1]]);
    await fixture.whenStable();

    expect(rows()).toHaveLength(1);
  });

  it('onay verilmezse silmez', async () => {
    confirm.mockReturnValue(false);
    await load(TRANSACTIONS);

    await clickDelete(rows()[0]);

    http.expectNone('/api/investments/transactions/11');
  });

  it('silme 422 dönerse sunucu mesajını gösterir', async () => {
    confirm.mockReturnValue(true);
    await load(TRANSACTIONS);

    await clickDelete(rows()[1]);
    http
      .expectOne('/api/investments/transactions/10')
      .flush(
        { detail: 'Bu işlem silinirse eldeki adet eksiye düşer' },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain(
      'Bu işlem silinirse eldeki adet eksiye düşer',
    );
    expect(rows()).toHaveLength(2);
  });

  it('işlem yoksa varlık silinebilir', async () => {
    confirm.mockReturnValue(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await load([]);

    expect(el.textContent).toContain('Bu varlıkta işlem yok');
    const button = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Varlığı sil'),
    )!;
    button.click();

    const req = http.expectOne('/api/assets/5');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(navigate).toHaveBeenCalledWith('/yatirimlar');
  });

  it('listede olmayan varlıkta "Varlık bulunamadı" gösterir', async () => {
    http.expectOne('/api/assets').flush([]);
    expectTransactions().flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(el.textContent).toContain('Varlık bulunamadı');
  });

  it('panel kabuğuna sarılıdır ve Esc yatırımlar sayfasına döner', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await load(TRANSACTIONS);

    expect(el.querySelector('.app-sheet > .app-sheet-panel')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(navigate).toHaveBeenCalledWith('/yatirimlar');
  });
});
