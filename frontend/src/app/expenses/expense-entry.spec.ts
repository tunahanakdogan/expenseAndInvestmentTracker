import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { provideRouter } from '@angular/router';
import { Account } from '../settings/account-api';
import { Category } from '../settings/category-api';
import { ExpenseEntry, LAST_ACCOUNT_KEY } from './expense-entry';

const ACCOUNTS: Account[] = [
  { id: 1, name: 'Cüzdan', type: 'CASH', currency: 'TRY', statementDay: null },
  { id: 2, name: 'Bonus', type: 'CREDIT_CARD', currency: 'TRY', statementDay: 15 },
];
const CATEGORIES: Category[] = [
  { id: 10, name: 'Market' },
  { id: 11, name: 'Ulaşım' },
];

describe('ExpenseEntry', () => {
  let fixture: ComponentFixture<ExpenseEntry>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let sheetRef: { dismiss: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 15, 12, 0));
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  async function setup(accounts: Account[] = ACCOUNTS) {
    sheetRef = { dismiss: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ExpenseEntry],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatBottomSheetRef, useValue: sheetRef },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ExpenseEntry);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    http.expectOne('/api/accounts').flush(accounts);
    http.expectOne('/api/categories').flush(CATEGORIES);
    await fixture.whenStable();
  }

  const input = (name: string) => el.querySelector<HTMLInputElement>(`input[formControlName=${name}]`)!;
  const installmentSelect = () => el.querySelector<HTMLSelectElement>('select[formControlName=installmentCount]');
  const accountSelect = () => el.querySelector<HTMLSelectElement>('select[formControlName=accountId]')!;
  const saveButton = () => el.querySelector<HTMLButtonElement>('button[type=submit]')!;

  function type(name: string, value: string) {
    input(name).value = value;
    input(name).dispatchEvent(new Event('input'));
  }

  async function select(element: HTMLSelectElement, value: string) {
    element.value = value;
    element.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function pickCategory(name: string) {
    const chip = Array.from(el.querySelectorAll('mat-chip-option')).find((c) => c.textContent?.includes(name))!;
    chip.querySelector('button')!.click();
    await fixture.whenStable();
  }

  async function save() {
    saveButton().click();
    await fixture.whenStable();
  }

  it('tutar boşken kaydetmez ve "Tutar gerekli" gösterir', async () => {
    await setup();
    await pickCategory('Market');
    await save();

    http.expectNone('/api/expenses');
    expect(el.textContent).toContain('Tutar gerekli');
  });

  it('sıfır veya geçersiz tutarda "Geçerli bir tutar gir" gösterir', async () => {
    await setup();
    await pickCategory('Market');

    for (const value of ['0', '0,00', 'abc', '1,234.56']) {
      type('amount', value);
      await save();

      http.expectNone('/api/expenses');
      expect(el.textContent).toContain('Geçerli bir tutar gir');
    }
  });

  it('kategori seçilmeden kaydetmez', async () => {
    await setup();
    expect(el.textContent).not.toContain('Kategori seç');

    type('amount', '12,5');
    await save();

    http.expectNone('/api/expenses');
    expect(el.textContent).toContain('Kategori seç');
  });

  it('taksit alanı yalnız kredi kartında görünür', async () => {
    await setup();
    expect(installmentSelect()).toBeNull();

    await select(accountSelect(), '2');
    expect(installmentSelect()).not.toBeNull();

    await select(accountSelect(), '1');
    expect(installmentSelect()).toBeNull();
  });

  it("karttan nakde dönünce taksit 1'e döner", async () => {
    await setup();
    type('amount', '100');
    await pickCategory('Market');
    await select(accountSelect(), '2');
    await select(installmentSelect()!, '6');
    await select(accountSelect(), '1');
    await save();

    const req = http.expectOne('/api/expenses');
    expect(req.request.body.installmentCount).toBe(1);
    expect(req.request.body.accountId).toBe(1);
    req.flush({});
  });

  it('geçerli formu gönderir, son hesabı saklar ve kapanır', async () => {
    await setup();
    type('amount', '1.234,56');
    await pickCategory('Market');
    await select(accountSelect(), '2');
    await select(installmentSelect()!, '3');
    type('date', '2026-11-15');
    await save();

    const req = http.expectOne('/api/expenses');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      accountId: 2,
      categoryId: 10,
      amount: '1234.56',
      date: '2026-11-15',
      installmentCount: 3,
      description: null,
    });
    req.flush({});

    expect(localStorage.getItem(LAST_ACCOUNT_KEY)).toBe('2');
    expect(LAST_ACCOUNT_KEY).toBe('finans.lastAccountId');
    expect(sheetRef.dismiss).toHaveBeenCalledWith(true);
  });

  it('açıklamayı kırparak gönderir', async () => {
    await setup();
    type('amount', '50');
    await pickCategory('Ulaşım');
    type('description', '  Taksi ');
    await save();

    const req = http.expectOne('/api/expenses');
    expect(req.request.body).toEqual({
      accountId: 1,
      categoryId: 11,
      amount: '50',
      date: '2026-11-15',
      installmentCount: 1,
      description: 'Taksi',
    });
    req.flush({});
  });

  it('son kullanılan hesap varsayılan gelir', async () => {
    localStorage.setItem(LAST_ACCOUNT_KEY, '2');
    await setup();

    expect(accountSelect().value).toBe('2');
    expect(installmentSelect()).not.toBeNull();
  });

  it('saklanan hesap silinmişse ilk hesaba düşer', async () => {
    localStorage.setItem(LAST_ACCOUNT_KEY, '99');
    await setup();

    expect(accountSelect().value).toBe('1');
  });

  it('tarih varsayılanı yerel bugündür', async () => {
    vi.setSystemTime(new Date(2026, 10, 15, 0, 30));
    await setup();

    expect(input('date').value).toBe('2026-11-15');
  });

  it('kaydederken düğme devre dışıdır ve çift dokunuş tek istek atar', async () => {
    await setup();
    type('amount', '12,5');
    await pickCategory('Market');
    await save();
    await save();

    expect(saveButton().disabled).toBe(true);
    expect(saveButton().textContent).toContain('Kaydediliyor…');
    const requests = http.match('/api/expenses');
    expect(requests.length).toBe(1);
    requests[0].flush({});
  });

  it('422 yanıtında sunucu mesajını gösterir', async () => {
    await setup();
    type('amount', '12,5');
    await pickCategory('Market');
    await save();

    http
      .expectOne('/api/expenses')
      .flush(
        { detail: 'Taksit yalnız kredi kartında yapılabilir' },
        { status: 422, statusText: 'Unprocessable Content' },
      );
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('Taksit yalnız kredi kartında yapılabilir');
    expect(sheetRef.dismiss).not.toHaveBeenCalled();
    expect(saveButton().disabled).toBe(false);
    expect(localStorage.getItem(LAST_ACCOUNT_KEY)).toBeNull();
  });

  it('hesap yokken yönlendirme mesajı gösterir', async () => {
    await setup([]);

    expect(el.textContent).toContain("Önce Ayarlar'dan bir hesap ekle");
    expect(el.querySelector('a[href="/ayarlar"]')).not.toBeNull();
    expect(el.querySelector('input[formControlName=amount]')).toBeNull();
  });
});
