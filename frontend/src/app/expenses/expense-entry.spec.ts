import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
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
  let navigate: ReturnType<typeof vi.spyOn>;

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
    await TestBed.configureTestingModule({
      imports: [ExpenseEntry],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ExpenseEntry);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    http.expectOne('/api/accounts').flush(accounts);
    http.expectOne('/api/categories').flush(CATEGORIES);
    await fixture.whenStable();
  }

  const installmentSelect = () => el.querySelector<HTMLSelectElement>('select[aria-label=Taksit]');
  const saveButton = () => el.querySelector<HTMLButtonElement>('button.save')!;
  const amountText = () => el.querySelector('.amount')!.textContent!.replace(/\s+/g, ' ').trim();
  const chip = (name: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>('button.app-chip')).find((c) => c.textContent?.trim() === name)!;

  async function tap(...labels: string[]) {
    for (const label of labels) {
      el.querySelector<HTMLButtonElement>(`.keypad button[aria-label="${label}"]`)!.click();
    }
    await fixture.whenStable();
  }

  async function pickCategory(name: string) {
    chip(name).click();
    await fixture.whenStable();
  }

  async function pickAccount(name: string) {
    chip(name).click();
    await fixture.whenStable();
  }

  async function select(element: HTMLSelectElement, value: string) {
    element.value = value;
    element.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function setText(selector: string, value: string) {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function save() {
    saveButton().click();
    await fixture.whenStable();
  }

  async function pressPhysical(key: string, target: EventTarget = document.body) {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await fixture.whenStable();
  }

  it('tuş takımı tutarı kurar, virgül tek, en çok 2 ondalık, sil çalışır', async () => {
    await setup();

    await tap('1', '2', '3', '4');
    expect(amountText()).toContain('1.234');
    await tap('Virgül', 'Virgül', '5', '0', '9');
    expect(amountText()).toContain('1.234,50');
    await tap('Sil', 'Sil', 'Sil');
    expect(amountText()).toContain('1.234');
    expect(amountText()).not.toContain(',');
  });

  it('fiziksel klavye rakam, virgül ve Backspace ile çalışır; alanlardayken tuşları yutmaz', async () => {
    await setup();

    await pressPhysical('4');
    await pressPhysical('2');
    await pressPhysical(',');
    await pressPhysical('5');
    await pressPhysical('x');
    expect(amountText()).toContain('42,5');
    await pressPhysical('Backspace');
    expect(amountText()).toContain('42,');

    await pressPhysical('9', el.querySelector('input.description')!);
    expect(amountText()).not.toContain('429');
  });

  it('tutar boşken kaydetmez ve "Tutar gerekli" gösterir', async () => {
    await setup();
    await pickCategory('Market');
    await save();

    http.expectNone('/api/expenses');
    expect(el.textContent).toContain('Tutar gerekli');
  });

  it('sıfır tutarda "Geçerli bir tutar gir" gösterir', async () => {
    await setup();
    await pickCategory('Market');
    await tap('0', 'Virgül', '0', '0');
    await save();

    http.expectNone('/api/expenses');
    expect(el.textContent).toContain('Geçerli bir tutar gir');
  });

  it('kategori seçilmeden kaydetmez', async () => {
    await setup();
    expect(el.textContent).not.toContain('Kategori seç');

    await tap('1', '2');
    await save();

    http.expectNone('/api/expenses');
    expect(el.textContent).toContain('Kategori seç');
  });

  it('kategori çipi aria-pressed ile seçimi bildirir', async () => {
    await setup();
    await pickCategory('Ulaşım');

    expect(chip('Ulaşım').getAttribute('aria-pressed')).toBe('true');
    expect(chip('Market').getAttribute('aria-pressed')).toBe('false');
  });

  it('taksit seçimi yalnız kredi kartında görünür', async () => {
    await setup();
    expect(installmentSelect()).toBeNull();

    await pickAccount('Bonus');
    expect(installmentSelect()).not.toBeNull();
    expect(installmentSelect()!.options.length).toBe(36);

    await pickAccount('Cüzdan');
    expect(installmentSelect()).toBeNull();
  });

  it('kredi kartında ekstre ayını gösterir', async () => {
    await setup();
    await pickAccount('Bonus');
    expect(el.querySelector('.note')?.textContent).toContain('ekstre Kasım 2026');

    await setText('label.date input', '2026-11-20');
    expect(el.querySelector('.note')?.textContent).toContain('ekstre Aralık 2026');
  });

  it("karttan nakde dönünce taksit 1'e döner", async () => {
    await setup();
    await tap('1', '0', '0');
    await pickCategory('Market');
    await pickAccount('Bonus');
    await select(installmentSelect()!, '6');
    await pickAccount('Cüzdan');
    await save();

    const req = http.expectOne('/api/expenses');
    expect(req.request.body.installmentCount).toBe(1);
    expect(req.request.body.accountId).toBe(1);
    req.flush({});
  });

  it('geçerli formu gönderir, son hesabı saklar ve listeye döner', async () => {
    await setup();
    await tap('1', '2', '3', '4', 'Virgül', '5', '6');
    await pickCategory('Market');
    await pickAccount('Bonus');
    await select(installmentSelect()!, '3');
    await setText('label.date input', '2026-11-14');
    await save();

    const req = http.expectOne('/api/expenses');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      accountId: 2,
      categoryId: 10,
      amount: '1234.56',
      date: '2026-11-14',
      installmentCount: 3,
      description: null,
    });
    req.flush({});

    expect(localStorage.getItem(LAST_ACCOUNT_KEY)).toBe('2');
    expect(LAST_ACCOUNT_KEY).toBe('finans.lastAccountId');
    expect(navigate).toHaveBeenCalledWith(['/harcamalar']);
  });

  it('sondaki virgülü ("12,") yok sayar', async () => {
    await setup();
    await tap('1', '2', 'Virgül');
    await pickCategory('Market');
    await save();

    const req = http.expectOne('/api/expenses');
    expect(req.request.body.amount).toBe('12');
    req.flush({});
  });

  it('açıklamayı kırparak gönderir', async () => {
    await setup();
    await tap('5', '0');
    await pickCategory('Ulaşım');
    await setText('input.description', '  Taksi ');
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

    expect(chip('Bonus').getAttribute('aria-pressed')).toBe('true');
    expect(installmentSelect()).not.toBeNull();
  });

  it('saklanan hesap silinmişse ilk hesaba düşer', async () => {
    localStorage.setItem(LAST_ACCOUNT_KEY, '99');
    await setup();

    expect(chip('Cüzdan').getAttribute('aria-pressed')).toBe('true');
  });

  it('localStorage kullanılamıyorsa form yine çalışır ve kaydeder', async () => {
    // Gizli sekme ya da engellenmiş depolama: getItem/setItem SecurityError fırlatır.
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    try {
      await setup();
      expect(chip('Cüzdan').getAttribute('aria-pressed')).toBe('true');

      await tap('1', '2');
      await pickCategory('Market');
      await save();
      http.expectOne('/api/expenses').flush({});

      expect(getItem).toHaveBeenCalledWith(LAST_ACCOUNT_KEY);
      expect(setItem).toHaveBeenCalledWith(LAST_ACCOUNT_KEY, '1');
      expect(navigate).toHaveBeenCalledWith(['/harcamalar']);
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });

  it('tarih varsayılanı yerel bugündür ve "Bugün" yazar', async () => {
    vi.setSystemTime(new Date(2026, 10, 15, 0, 30));
    await setup();

    expect(el.querySelector<HTMLInputElement>('label.date input')!.value).toBe('2026-11-15');
    expect(el.querySelector('label.date')!.textContent).toContain('Bugün');

    await setText('label.date input', '2026-11-08');
    expect(el.querySelector('label.date')!.textContent).toContain('8 Kas');
  });

  it('kaydederken düğme devre dışıdır ve çift dokunuş tek istek atar', async () => {
    await setup();
    await tap('1', '2');
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
    await tap('1', '2');
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
    expect(navigate).not.toHaveBeenCalled();
    expect(saveButton().disabled).toBe(false);
    expect(localStorage.getItem(LAST_ACCOUNT_KEY)).toBeNull();
  });

  it('kapat düğmesi listeye bağlanır', async () => {
    await setup();

    expect(el.querySelector('a[aria-label="Kapat"]')?.getAttribute('href')).toBe('/harcamalar');
  });

  it('hesap yokken yönlendirme mesajı gösterir', async () => {
    await setup([]);

    expect(el.textContent).toContain("Önce Ayarlar'dan bir hesap ekle");
    expect(el.querySelector('a[href="/ayarlar"]')).not.toBeNull();
    expect(el.querySelector('.keypad')).toBeNull();
  });

  describe('web düzeni', () => {
    const webInput = () => el.querySelector<HTMLInputElement>('input.amount-input')!;

    it('tutar alanı "1234,5"i kabul eder, "1,234"ü reddeder', async () => {
      await setup();

      expect(webInput().getAttribute('inputmode')).toBe('decimal');
      await setText('input.amount-input', '1234,5');
      expect(webInput().value).toBe('1234,5');
      expect(amountText()).toContain('1.234,5');

      await setText('input.amount-input', '1,234');
      expect(webInput().value).toBe('1234,5');
      await setText('input.amount-input', 'abc');
      expect(webInput().value).toBe('1234,5');
    });

    it('web tutar alanından girilen tutar kaydedilir', async () => {
      await setup();
      await setText('input.amount-input', '1234,5');
      await pickCategory('Market');
      await save();

      expect(http.expectOne('/api/expenses').request.body).toMatchObject({ amount: '1234.5', categoryId: 10 });
    });

    it('Enter kaydeder, Esc listeye döner', async () => {
      await setup();
      await setText('input.amount-input', '50');
      await pickCategory('Market');
      await pressPhysical('Enter', webInput());

      expect(http.expectOne('/api/expenses').request.body).toMatchObject({ amount: '50' });

      await pressPhysical('Escape', webInput());
      expect(navigate).toHaveBeenCalledWith(['/harcamalar']);
    });

    it('panel app-sheet içinde; hesap, taksit ve tarih tek satırda, ekstre notu yanında', async () => {
      await setup();

      expect(el.querySelector('.app-sheet .app-sheet-panel')).not.toBeNull();
      const row = el.querySelector('.web-row')!;
      expect(row.querySelector('select[aria-label="Hesap seç"]')).not.toBeNull();
      expect(row.querySelector('input[type=date]')).not.toBeNull();
      expect(row.querySelector('select[aria-label="Taksit sayısı"]')).toBeNull();
      expect(el.querySelector('.save-note')?.textContent).toContain('Enter ile kaydet');

      await select(row.querySelector('select[aria-label="Hesap seç"]')!, '2');
      expect(row.querySelector('select[aria-label="Taksit sayısı"]')).not.toBeNull();
      expect(el.querySelector('.save-note')?.textContent).toContain('Ekstre:');
    });
  });
});
