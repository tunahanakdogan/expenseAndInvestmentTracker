import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Expense } from './expense-api';
import { ExpenseDetail } from './expense-detail';

const EXPENSE: Expense = {
  id: 5,
  accountId: 2,
  accountName: 'Bonus',
  categoryId: 10,
  categoryName: 'Elektronik',
  description: 'Telefon',
  date: '2026-11-10',
  totalAmount: '100.0000',
  currency: 'TRY',
  installmentCount: 3,
  payments: [
    { installmentNo: 1, period: '2026-11', amount: '33.3300', status: 'ACTIVE' },
    { installmentNo: 2, period: '2026-12', amount: '33.3300', status: 'ACTIVE' },
    { installmentNo: 3, period: '2027-01', amount: '33.3400', status: 'ACTIVE' },
  ],
};

describe('ExpenseDetail', () => {
  let fixture: ComponentFixture<ExpenseDetail>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dialogRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ExpenseDetail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: { expenseId: 5 } },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ExpenseDetail);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    http.expectOne('/api/expenses/5').flush(EXPENSE);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  async function click(selector: string) {
    el.querySelector<HTMLButtonElement>(selector)!.click();
    await fixture.whenStable();
  }

  async function editThird(value: string) {
    await click('li:nth-child(3) button.edit');
    const input = el.querySelector<HTMLInputElement>('li:nth-child(3) input')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await click('li:nth-child(3) button[type=submit]');
  }

  it('harcamayı tüm taksitleriyle gösterir', () => {
    expect(el.querySelectorAll('li').length).toBe(3);
    for (const text of [
      'Elektronik',
      'Telefon',
      'Bonus',
      '10.11.2026',
      '1/3',
      '3/3',
      'Kasım 2026',
      'Ocak 2027',
      '33,33 ₺',
      '33,34 ₺',
      '100,00 ₺',
    ]) {
      expect(el.textContent).toContain(text);
    }
  });

  it('taksit düzenleme PUT atar ve toplamı günceller', async () => {
    await editThird('40');

    const req = http.expectOne('/api/expenses/5/payments/3');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ amount: '40' });
    req.flush({
      ...EXPENSE,
      totalAmount: '106.6600',
      payments: [...EXPENSE.payments.slice(0, 2), { ...EXPENSE.payments[2], amount: '40.0000' }],
    });
    await fixture.whenStable();

    expect(el.textContent).toContain('106,66 ₺');
    expect(el.textContent).toContain('40,00 ₺');
    expect(el.querySelector('li input')).toBeNull();

    await click('button.close');
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('geçersiz taksit tutarında istek atmaz', async () => {
    for (const value of ['0', 'abc', '']) {
      await editThird(value);

      http.expectNone('/api/expenses/5/payments/3');
      expect(el.querySelector('[role=alert]')?.textContent).toContain('Geçerli bir tutar gir');
      await click('li:nth-child(3) button[type=button]');
    }
  });

  it('düzenleme 422 dönerse mesajı gösterir ve düzenleme açık kalır', async () => {
    await editThird('40');

    http
      .expectOne('/api/expenses/5/payments/3')
      .flush({ detail: 'Taksit bulunamadı' }, { status: 422, statusText: 'Unprocessable Content' });
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('Taksit bulunamadı');
    expect(el.querySelector('li:nth-child(3) input')).not.toBeNull();
  });

  it('değişiklik yoksa false ile kapanır', async () => {
    await click('button.close');

    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  it('silme onaylanınca DELETE atar ve true ile kapanır', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await click('button.delete');

    expect(confirm).toHaveBeenCalledWith('Harcama tüm taksitleriyle silinsin mi?');
    const req = http.expectOne('/api/expenses/5');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('silme onaylanmazsa istek atmaz', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await click('button.delete');

    http.expectNone('/api/expenses/5');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
