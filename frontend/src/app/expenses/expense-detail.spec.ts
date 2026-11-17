import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Expense } from './expense-api';
import { ExpenseDetail } from './expense-detail';
import { EXPENSE_ROUTES } from './expenses.routes';

const EXPENSE: Expense = {
  id: 5,
  accountId: 2,
  accountName: 'Bonus',
  categoryId: 10,
  categoryName: 'Elektronik',
  description: 'Telefon',
  date: '2026-10-10',
  totalAmount: '100.0000',
  currency: 'TRY',
  installmentCount: 3,
  payments: [
    { installmentNo: 1, period: '2026-10', amount: '33.3300', status: 'ACTIVE' },
    { installmentNo: 2, period: '2026-11', amount: '33.3300', status: 'ACTIVE' },
    { installmentNo: 3, period: '2026-12', amount: '33.3400', status: 'ACTIVE' },
  ],
};

describe('ExpenseDetail', () => {
  let fixture: ComponentFixture<ExpenseDetail>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 15));
    await TestBed.configureTestingModule({
      imports: [ExpenseDetail],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } },
      ],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ExpenseDetail);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    http.expectOne('/api/expenses/5').flush(EXPENSE);
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  async function click(selector: string) {
    el.querySelector<HTMLButtonElement>(selector)!.click();
    await fixture.whenStable();
  }

  async function editThird(value: string) {
    await click('button[aria-label="3. taksiti düzenle"]');
    const input = el.querySelector<HTMLInputElement>('li input')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await click('li button[type=submit]');
  }

  it('rota tam ekran verisiyle tanımlıdır ve yeni, :id\'den önce gelir', () => {
    const paths = EXPENSE_ROUTES.map((r) => r.path);
    expect(paths).toEqual(['', 'yeni', ':id']);
    expect(EXPENSE_ROUTES[1].data).toEqual({ fullscreen: true });
    expect(EXPENSE_ROUTES[2].data).toEqual({ fullscreen: true });
  });

  it('başlık, meta, toplam ve taksit özetini gösterir', () => {
    expect(el.querySelector('h1')?.textContent).toBe('Telefon');
    expect(el.querySelector('.meta')?.textContent).toContain('Elektronik · Bonus · 10 Ekim 2026');
    expect(el.querySelector('.total')?.textContent?.trim()).toBe('100,00 ₺');
    expect(el.querySelector('.sub')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('3 taksit · ayda 33,33 ₺');
    expect(el.querySelector('a[aria-label="Geri"]')?.getAttribute('href')).toBe('/harcamalar');
  });

  it('ilerleme şeridi adet bazlı: geçmiş, bu ay, gelecek', () => {
    const segments = Array.from(el.querySelectorAll('.segment')).map((s) => s.className.replace('segment', '').trim());
    expect(segments).toEqual(['past', 'current', 'future']);
    expect(el.querySelector('.segments')?.getAttribute('aria-label')).toBe('3 taksitten 2 tanesi bu aya kadar');
  });

  it('taksitleri ve bu ayı gösterir', () => {
    expect(el.querySelectorAll('li').length).toBe(3);
    for (const text of ['1/3', '3/3', 'Ekim 2026', 'Aralık 2026', '33,34 ₺', 'bu ay']) {
      expect(el.querySelector('ul')?.textContent).toContain(text);
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
  });

  it('geçersiz taksit tutarında istek atmaz', async () => {
    for (const value of ['0', 'abc', '']) {
      await editThird(value);

      http.expectNone('/api/expenses/5/payments/3');
      expect(el.querySelector('[role=alert]')?.textContent).toContain('Geçerli bir tutar gir');
      await click('li button[type=button]');
    }
  });

  it('düzenleme 422 dönerse mesajı gösterir ve düzenleme açık kalır', async () => {
    await editThird('40');

    http
      .expectOne('/api/expenses/5/payments/3')
      .flush({ detail: 'Taksit bulunamadı' }, { status: 422, statusText: 'Unprocessable Content' });
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('Taksit bulunamadı');
    expect(el.querySelector('li input')).not.toBeNull();
  });

  it('silme onaylanınca DELETE atar ve listeye döner', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await click('button.delete');

    expect(confirm).toHaveBeenCalledWith('Harcama tüm taksitleriyle silinsin mi?');
    const req = http.expectOne('/api/expenses/5');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(navigate).toHaveBeenCalledWith(['/harcamalar']);
  });

  it('silme onaylanmazsa istek atmaz', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await click('button.delete');

    http.expectNone('/api/expenses/5');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('sayfa app-sheet paneli içinde; Esc listeye döner', async () => {
    expect(el.querySelector('.app-sheet .app-sheet-panel')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/harcamalar']);
  });

  it('Esc taksit düzenlerken yalnız düzenlemeyi bırakır', async () => {
    await click('button[aria-label="2. taksiti düzenle"]');
    expect(el.querySelector('form')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(el.querySelector('form')).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });
});
