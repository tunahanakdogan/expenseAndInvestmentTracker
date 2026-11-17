import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PaymentRow, PeriodPayments } from './expense-api';
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
  categoryTotals: [
    { categoryId: 1, name: 'Elektronik', currency: 'TRY', amount: '100.0000', sharePct: '100.00' },
    { categoryId: 2, name: 'Giyim', currency: 'TRY', amount: '25.0000', sharePct: '25.00' },
    { categoryId: 3, name: 'Yeme-İçme', currency: 'USD', amount: '20.0000', sharePct: '100.00' },
  ],
};
const EMPTY = (period: string): PeriodPayments => ({ period, payments: [], totals: [], categoryTotals: [] });

describe('ExpenseList', () => {
  let fixture: ComponentFixture<ExpenseList>;
  let http: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 15));
    await TestBed.configureTestingModule({
      imports: [ExpenseList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
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

  it('ayarlar dişlisi /ayarlar bağlantısıdır', async () => {
    await flush('2026-11');

    expect(el.querySelector('a[aria-label="Ayarlar"]')?.getAttribute('href')).toBe('/ayarlar');
  });

  it('hero: ilk para birimi büyük, diğerleri ve ödeme sayısı alt satırda', async () => {
    await flush('2026-11', NOVEMBER);

    expect(el.querySelector('.hero .app-label')?.textContent).toContain('Bu ay ödenecek');
    expect(el.querySelector('.hero .big')?.textContent?.trim()).toBe('100,00 ₺');
    expect(el.querySelector('.hero .sub')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('ve 20,00 $ · 2 ödeme');
  });

  it('kategori kutucukları yalnız ana para biriminin kategorilerini ve oran çubuğunu gösterir', async () => {
    await flush('2026-11', NOVEMBER);

    const tiles = Array.from(el.querySelectorAll('.tile'));
    expect(tiles.map((t) => t.querySelector('.tile-name')?.textContent)).toEqual(['Elektronik', 'Giyim']);
    expect(tiles[1].querySelector('.tile-amount')?.textContent?.trim()).toBe('25,00 ₺');
    expect(tiles[1].querySelector<HTMLElement>('.fill')!.style.width).toBe('25%');
  });

  it('ödeme satırları başlık, meta, tutar ve rozet gösterir', async () => {
    await flush('2026-11', NOVEMBER);

    const rows = Array.from(el.querySelectorAll('a.row'));
    expect(rows.length).toBe(2);
    // Açıklama yoksa başlık kategori adıdır.
    expect(rows[0].querySelector('.title')?.textContent?.trim()).toBe('Yeme-İçme');
    expect(rows[0].querySelector('.initial')?.textContent?.trim()).toBe('Y');
    expect(rows[0].querySelector('.badge')?.textContent?.trim()).toBe('Peşin');
    expect(rows[1].querySelector('.title')?.textContent?.trim()).toBe('Telefon');
    expect(rows[1].querySelector('.meta')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Elektronik · 10 Eki · Bonus',
    );
    expect(rows[1].querySelector('.amount')?.textContent?.trim()).toBe('100,00 ₺');
    expect(rows[1].querySelector('.badge')?.textContent?.trim()).toBe('2/6 taksit');
  });

  it('satır detay rotasına bağlanır', async () => {
    await flush('2026-11', NOVEMBER);

    expect(el.querySelectorAll('a.row')[1].getAttribute('href')).toBe('/harcamalar/5');
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

  it('web: sayfa başlığı ve dikey kategori listesi (ad, tutar, %, çubuk)', async () => {
    await flush('2026-11', NOVEMBER);

    expect(el.querySelector('h1.page-title')?.textContent).toBe('Harcamalar');
    const cats = Array.from(el.querySelectorAll('.cats .cat'));
    expect(cats.map((c) => c.querySelector('.cat-name')?.textContent)).toEqual(['Elektronik', 'Giyim']);
    expect(cats[1].querySelector('.cat-amount')?.textContent?.trim()).toBe('25,00 ₺');
    expect(cats[1].querySelector('.cat-pct')?.textContent?.trim()).toBe('%25,00');
    expect(cats[1].querySelector<HTMLElement>('.fill')!.style.width).toBe('25%');
    expect(el.querySelector('.cats')?.classList).toContain('app-web-only');
    expect(el.querySelector('.tiles')?.classList).toContain('app-mobile-only');
  });

  it('web: ödemeler tablosu sütunları ve satırları gösterir, satır detaya bağlanır', async () => {
    await flush('2026-11', NOVEMBER);

    const heads = Array.from(el.querySelectorAll('table.ptable thead th')).map((th) => th.textContent?.trim());
    expect(heads).toEqual(['Tarih', 'Açıklama', 'Kategori', 'Hesap', 'Taksit', 'Tutar']);
    const rows = Array.from(el.querySelectorAll('table.ptable tbody tr'));
    expect(rows.length).toBe(2);
    const cells = Array.from(rows[1].querySelectorAll('td')).map((td) => td.textContent?.replace(/\s+/g, ' ').trim());
    expect(cells).toEqual(['10 Eki', 'TTelefon', 'Elektronik', 'Bonus', '2/6 taksit', '100,00 ₺']);
    expect(rows[1].querySelector('a')?.getAttribute('href')).toBe('/harcamalar/5');
    expect(rows[1].querySelector('td.num')?.classList).toContain('app-num');
    expect(el.querySelector('table.ptable')?.classList).toContain('app-web-only');
  });
});
