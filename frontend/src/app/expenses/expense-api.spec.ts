import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ExpenseApi, NewExpense } from './expense-api';

describe('ExpenseApi', () => {
  let api: ExpenseApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ExpenseApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('dönemin ödemelerini ister', () => {
    api.list('2026-11').subscribe();

    const req = http.expectOne('/api/expenses?period=2026-11');
    expect(req.request.method).toBe('GET');
    req.flush({ period: '2026-11', payments: [], totals: [] });
  });

  it('harcamayı tutarı string olarak gönderir', () => {
    const input: NewExpense = {
      accountId: 2,
      categoryId: 10,
      amount: '1234.56',
      date: '2026-11-15',
      installmentCount: 3,
      description: null,
    };
    api.create(input).subscribe();

    const req = http.expectOne('/api/expenses');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush({});
  });

  it('taksit tutarını günceller', () => {
    api.updatePayment(7, 2, '40.00').subscribe();

    const req = http.expectOne('/api/expenses/7/payments/2');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ amount: '40.00' });
    req.flush({});
  });

  it('harcamayı getirir ve siler', () => {
    api.get(7).subscribe();
    expect(http.expectOne('/api/expenses/7').request.method).toBe('GET');

    api.remove(7).subscribe();
    const req = http.expectOne((r) => r.method === 'DELETE' && r.url === '/api/expenses/7');
    req.flush(null);
  });
});
