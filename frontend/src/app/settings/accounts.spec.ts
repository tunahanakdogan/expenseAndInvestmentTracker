import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { Account } from './account-api';
import { AccountForm } from './account-form';
import { Accounts } from './accounts';

const CASH: Account = { id: 1, name: 'Cüzdan', type: 'CASH', currency: 'TRY', statementDay: null };
const CARD: Account = { id: 3, name: 'Bonus', type: 'CREDIT_CARD', currency: 'TRY', statementDay: 15 };

describe('Accounts', () => {
  let fixture: ComponentFixture<Accounts>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let dialog: { open: ReturnType<typeof vi.fn> };
  let snackBar: { open: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    dialog = { open: vi.fn().mockReturnValue({ afterClosed: () => of(true) }) };
    snackBar = { open: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [Accounts],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Accounts);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  async function flushList(accounts: Account[]) {
    http.expectOne('/api/accounts').flush(accounts);
    await fixture.whenStable();
  }

  it('hesapları listeler, boşken mesaj gösterir', async () => {
    await flushList([]);
    expect(el.textContent).toContain('Henüz hesap yok');

    el.querySelector<HTMLButtonElement>('button.add')!.click();
    await flushList([CASH, CARD]);

    expect(el.textContent).not.toContain('Henüz hesap yok');
    expect(el.textContent).toContain('Cüzdan');
    expect(el.textContent).toContain('Nakit');
    expect(el.textContent).toContain('Bonus');
    expect(el.textContent).toContain('Kredi Kartı');
    expect(el.textContent).toContain('Kesim günü: 15');
  });

  it('düzenle hesabı forma verir ve kayıt sonrası listeyi yeniler', async () => {
    await flushList([CASH, CARD]);

    el.querySelector<HTMLButtonElement>('button[aria-label="Bonus hesabını düzenle"]')!.click();

    expect(dialog.open).toHaveBeenCalledWith(AccountForm, expect.objectContaining({ data: CARD }));
    await flushList([CASH, CARD]);
  });

  it('silme onaylanınca DELETE atar ve listeyi yeniler', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await flushList([CASH, CARD]);

    el.querySelector<HTMLButtonElement>('button[aria-label="Bonus hesabını sil"]')!.click();

    const req = http.expectOne('/api/accounts/3');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    await flushList([CASH]);

    expect(el.textContent).not.toContain('Bonus');
  });

  it('silme onaylanmazsa istek atmaz', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await flushList([CASH]);

    el.querySelector<HTMLButtonElement>('button[aria-label="Cüzdan hesabını sil"]')!.click();

    http.expectNone('/api/accounts/1');
  });

  it('silme 422 dönerse mesajı gösterir', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await flushList([CASH]);

    el.querySelector<HTMLButtonElement>('button[aria-label="Cüzdan hesabını sil"]')!.click();
    http
      .expectOne('/api/accounts/1')
      .flush({ detail: 'Harcaması olan hesap silinemez' }, { status: 422, statusText: 'Unprocessable Content' });

    expect(snackBar.open).toHaveBeenCalledWith('Harcaması olan hesap silinemez', 'Tamam', expect.anything());
  });
});
