import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Category } from './category-api';
import { Categories } from './categories';

const LIST: Category[] = [
  { id: 1, name: 'Market' },
  { id: 2, name: 'Ulaşım' },
];

describe('Categories', () => {
  let fixture: ComponentFixture<Categories>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let snackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    snackBar = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [Categories],
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: MatSnackBar, useValue: snackBar }],
    }).compileComponents();
    fixture = TestBed.createComponent(Categories);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    await flushList(LIST);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  async function flushList(categories: Category[]) {
    http.expectOne('/api/categories').flush(categories);
    await fixture.whenStable();
  }

  function type(selector: string, value: string) {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function click(selector: string) {
    el.querySelector<HTMLButtonElement>(selector)!.click();
    await fixture.whenStable();
  }

  it('kategorileri listeler ve yenisini ekler', async () => {
    expect(el.textContent).toContain('Market');
    expect(el.textContent).toContain('Ulaşım');

    type('form.add input', ' Evcil Hayvan ');
    await click('form.add button[type=submit]');

    const req = http.expectOne('/api/categories');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Evcil Hayvan' });
    req.flush({ id: 3, name: 'Evcil Hayvan' });
    await flushList([...LIST, { id: 3, name: 'Evcil Hayvan' }]);

    expect(el.textContent).toContain('Evcil Hayvan');
    expect(el.querySelector<HTMLInputElement>('form.add input')!.value).toBe('');
  });

  it('boş adla ekleme isteği atmaz', async () => {
    type('form.add input', '   ');
    await click('form.add button[type=submit]');

    http.expectNone('/api/categories');
  });

  it('yeniden adlandırma PUT atar', async () => {
    await click('button[aria-label="Ulaşım kategorisini yeniden adlandır"]');
    expect(el.querySelector<HTMLInputElement>('form.rename input')!.value).toBe('Ulaşım');

    type('form.rename input', 'Kedi');
    await click('form.rename button[type=submit]');

    const req = http.expectOne('/api/categories/2');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Kedi' });
    req.flush({ id: 2, name: 'Kedi' });
    await flushList([LIST[0], { id: 2, name: 'Kedi' }]);

    expect(el.querySelector('form.rename')).toBeNull();
    expect(el.textContent).toContain('Kedi');
  });

  it('silme onaylanınca DELETE atar ve listeyi yeniler', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await click('button[aria-label="Ulaşım kategorisini sil"]');

    const req = http.expectOne('/api/categories/2');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    await flushList([LIST[0]]);

    expect(el.textContent).not.toContain('Ulaşım');
  });

  it('silme 422 dönerse mesajı gösterir', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await click('button[aria-label="Market kategorisini sil"]');

    http
      .expectOne('/api/categories/1')
      .flush({ detail: 'Harcaması olan kategori silinemez' }, { status: 422, statusText: 'Unprocessable Content' });

    expect(snackBar.open).toHaveBeenCalledWith('Harcaması olan kategori silinemez', 'Tamam', expect.anything());
  });
});
