import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { PaymentRow, PeriodPayments } from './expense-api';
import { ExpenseDetail } from './expense-detail';
import { ExpenseEntry } from './expense-entry';
import { ExpenseList } from './expense-list';

const PHONE: PaymentRow = {
  expenseId: 5,
  installmentNo: 2,
  installmentCount: 6,
  amount: '100.0000',
  currency: 'TRY',
  expenseDate: '2026-10-10',
  description: 'Telefon',
  categoryName: 'Elektronik',
  accountName: 'Bonus',
};
const COFFEE: PaymentRow = {
  expenseId: 6,
  installmentNo: 1,
  installmentCount: 1,
  amount: '20.0000',
  currency: 'USD',
  expenseDate: '2026-11-05',
  description: null,
  categoryName: 'Yeme-İçme',
  accountName: 'Dolar',
};
const NOVEMBER: PeriodPayments = {
  period: '2026-11',
  payments: [COFFEE, PHONE],
  totals: [
    { currency: 'TRY', amount: '100.0000' },
    { currency: 'USD', amount: '20.0000' },
  ],
};
const EMPTY = (period: string): PeriodPayments => ({ period, payments: [], totals: [] });

describe('ExpenseList', () => {
  let fixture: ComponentFixture<ExpenseList>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let bottomSheet: { open: ReturnType<typeof vi.fn> };
  let dialog: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 15));
    bottomSheet = { open: vi.fn().mockReturnValue({ afterDismissed: () => of(true) }) };
    dialog = { open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }) };
    await TestBed.configureTestingModule({
      imports: [ExpenseList],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatBottomSheet, useValue: bottomSheet },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ExpenseList);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  async function flush(period: string, body: PeriodPayments = EMPTY(period)) {
    http.expectOne(`/api/expenses?period=${period}`).flush(body);
    await fixture.whenStable();
  }

  async function click(selector: string) {
    el.querySelector<HTMLButtonElement>(selector)!.click();
    await fixture.whenStable();
  }

  it('açılışta içinde bulunulan ayı ister ve başlıkta gösterir', async () => {
    expect(el.textContent).toContain('Kasım 2026');
    await flush('2026-11');
  });

  it('ödemeleri ve para birimi başına toplamları gösterir', async () => {
    await flush('2026-11', NOVEMBER);

    for (const text of ['Elektronik', 'Telefon', 'Bonus', '2/6', '100,00 ₺', '20,00 $', '10.10.2026', 'Yeme-İçme']) {
      expect(el.textContent).toContain(text);
    }
    const totals = Array.from(el.querySelectorAll('.totals .total')).map((t) => t.textContent?.trim());
    expect(totals).toEqual(['100,00 ₺', '20,00 $']);
  });

  it('tek çekimde taksit rozeti göstermez', async () => {
    await flush('2026-11', { period: '2026-11', payments: [COFFEE], totals: [] });

    expect(el.textContent).not.toContain('1/1');
    expect(el.querySelector('.badge')).toBeNull();
  });

  it('sonraki ve önceki ay düğmeleri dönemi değiştirir', async () => {
    await flush('2026-11');

    await click('button[aria-label="Sonraki ay"]');
    expect(el.textContent).toContain('Aralık 2026');
    await flush('2026-12');

    await click('button[aria-label="Önceki ay"]');
    await flush('2026-11');
    await click('button[aria-label="Önceki ay"]');
    expect(el.textContent).toContain('Ekim 2026');
    await flush('2026-10');
  });

  it('ay hızlı değişince eski isteği iptal eder', async () => {
    await click('button[aria-label="Sonraki ay"]');

    const pending = http.match((r) => r.url === '/api/expenses');
    expect(pending.map((r) => [r.request.params.get('period'), r.cancelled])).toEqual([
      ['2026-11', true],
      ['2026-12', false],
    ]);
    pending[1].flush(EMPTY('2026-12'));
  });

  it('ödeme yoksa boş durum gösterir', async () => {
    await flush('2026-11');

    expect(el.textContent).toContain('Bu ay ödeme yok');
  });

  it('yükleme hatasında mesaj ve tekrar dene gösterir', async () => {
    http.expectOne('/api/expenses?period=2026-11').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(el.textContent).toContain('Liste yüklenemedi');

    await click('button.retry');
    await flush('2026-11', NOVEMBER);

    expect(el.textContent).not.toContain('Liste yüklenemedi');
    expect(el.textContent).toContain('Telefon');
  });

  it('FAB hızlı girişi açar ve kayıt sonrası listeyi yeniler', async () => {
    await flush('2026-11');

    await click('button[aria-label="Harcama ekle"]');

    expect(bottomSheet.open).toHaveBeenCalledWith(ExpenseEntry);
    await flush('2026-11', NOVEMBER);
    expect(el.textContent).toContain('Telefon');
  });

  it('hızlı giriş kaydetmeden kapanırsa listeyi yenilemez', async () => {
    bottomSheet.open.mockReturnValue({ afterDismissed: () => of(undefined) });
    await flush('2026-11');

    await click('button[aria-label="Harcama ekle"]');

    http.expectNone('/api/expenses?period=2026-11');
  });

  it('satıra dokununca detayı açar ve kapanınca listeyi yeniler', async () => {
    await flush('2026-11', NOVEMBER);

    await click('li:nth-child(2) button.row');

    expect(dialog.open.mock.calls[0][0]).toBe(ExpenseDetail);
    expect(dialog.open.mock.calls[0][1]).toEqual(expect.objectContaining({ data: { expenseId: 5 } }));
    await flush('2026-11');
  });
});
