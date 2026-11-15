import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { InvestmentApi } from './investment-api';

describe('InvestmentApi', () => {
  let api: InvestmentApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(InvestmentApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('usdRate kuru döndürür', () => {
    let rate: string | null | undefined;
    api.usdRate('2026-11-10').subscribe((r) => (rate = r));

    const req = http.expectOne((r) => r.url === '/api/pricing/rate');
    expect(req.request.params.get('currency')).toBe('USD');
    expect(req.request.params.get('date')).toBe('2026-11-10');
    req.flush({ currency: 'USD', date: '2026-11-10', rateTry: '34.12340000' });

    expect(rate).toBe('34.12340000');
  });

  it("usdRate 404'te null döner", () => {
    let rate: string | null | undefined;
    api.usdRate('2026-11-10').subscribe((r) => (rate = r));

    http.expectOne((r) => r.url === '/api/pricing/rate').flush(null, { status: 404, statusText: 'Not Found' });

    expect(rate).toBeNull();
  });

  it('usdRate diğer hataları yükseltir', () => {
    let failed = false;
    api.usdRate('2026-11-10').subscribe({ error: () => (failed = true) });

    http.expectOne((r) => r.url === '/api/pricing/rate').flush(null, { status: 500, statusText: 'Error' });

    expect(failed).toBe(true);
  });

  it('transactions assetId parametresiyle ister', () => {
    api.transactions(5).subscribe();

    const req = http.expectOne((r) => r.url === '/api/investments/transactions');
    expect(req.request.params.get('assetId')).toBe('5');
    req.flush([]);
  });
});
