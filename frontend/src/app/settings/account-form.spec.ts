import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Account } from './account-api';
import { AccountForm } from './account-form';

describe('AccountForm', () => {
  let fixture: ComponentFixture<AccountForm>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let dialogRef: { close: ReturnType<typeof vi.fn> };

  async function setup(account: Account | null = null) {
    dialogRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [AccountForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: account },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AccountForm);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  const statementDayInput = () => el.querySelector<HTMLInputElement>('input[formControlName=statementDay]');

  function type(selector: string, value: string) {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function select(name: string, value: string) {
    const select = el.querySelector<HTMLSelectElement>(`select[formControlName=${name}]`)!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function submit() {
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
  }

  it('kesim günü alanı yalnız kredi kartında görünür', async () => {
    await setup();
    expect(statementDayInput()).toBeNull();

    await select('type', 'CREDIT_CARD');
    expect(statementDayInput()).not.toBeNull();

    await select('type', 'BANK');
    expect(statementDayInput()).toBeNull();
  });

  it('kredi kartında kesim günü zorunlu ve 1–31', async () => {
    await setup();
    type('input[formControlName=name]', 'Bonus');
    await select('type', 'CREDIT_CARD');

    for (const value of ['', '0', '32']) {
      type('input[formControlName=statementDay]', value);
      await submit();

      http.expectNone('/api/accounts');
      expect(el.textContent).toContain('Kesim günü 1–31 arasında olmalı');
    }
  });

  it('boş adla istek atmaz', async () => {
    await setup();
    await submit();
    http.expectNone('/api/accounts');
    expect(el.textContent).toContain('Ad gerekli');

    type('input[formControlName=name]', '   ');
    await submit();
    http.expectNone('/api/accounts');
  });

  it('yeni kredi kartını kaydeder ve dialogu kapatır', async () => {
    await setup();
    type('input[formControlName=name]', 'Bonus');
    await select('type', 'CREDIT_CARD');
    type('input[formControlName=statementDay]', '15');
    await submit();

    const req = http.expectOne('/api/accounts');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Bonus', type: 'CREDIT_CARD', currency: 'TRY', statementDay: 15 });
    req.flush({ id: 1, ...req.request.body });

    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('nakit hesapta statementDay null gönderir', async () => {
    await setup();
    type('input[formControlName=name]', 'Cüzdan');
    await select('type', 'CREDIT_CARD');
    type('input[formControlName=statementDay]', '15');
    await select('type', 'CASH');
    await select('currency', 'USD');
    await submit();

    const req = http.expectOne('/api/accounts');
    expect(req.request.body).toEqual({ name: 'Cüzdan', type: 'CASH', currency: 'USD', statementDay: null });
    req.flush({ id: 1, ...req.request.body });
  });

  it('düzenlemede PUT atar ve 422 mesajını gösterir', async () => {
    await setup({ id: 3, name: 'Bonus', type: 'CREDIT_CARD', currency: 'TRY', statementDay: 15 });
    expect(statementDayInput()!.value).toBe('15');
    type('input[formControlName=statementDay]', '20');
    await submit();

    const req = http.expectOne('/api/accounts/3');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Bonus', type: 'CREDIT_CARD', currency: 'TRY', statementDay: 20 });
    req.flush(
      { detail: 'Harcaması olan hesabın türü, para birimi veya kesim günü değiştirilemez' },
      { status: 422, statusText: 'Unprocessable Content' },
    );
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain(
      'Harcaması olan hesabın türü, para birimi veya kesim günü değiştirilemez',
    );
    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(el.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
  });

  it('sunucu hatasında genel mesaj gösterir', async () => {
    await setup();
    type('input[formControlName=name]', 'Cüzdan');
    await submit();

    http.expectOne('/api/accounts').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('Kaydedilemedi, tekrar dene');
  });
});
