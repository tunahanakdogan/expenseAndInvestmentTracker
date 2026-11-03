import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(Login);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function type(selector: string, value: string) {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit() {
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
  }

  it('boş formda istek atmaz ve zorunlu alan hatalarını gösterir', async () => {
    await submit();

    http.expectNone('/api/auth/login');
    expect(el.textContent).toContain('Kullanıcı adı gerekli');
    expect(el.textContent).toContain('Şifre gerekli');
  });

  it('başarılı girişte token saklanır ve ana sayfaya gider', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    type('input[formControlName=username]', 'tunahan');
    type('input[formControlName=password]', 'sifre');
    await submit();

    const req = http.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ username: 'tunahan', password: 'sifre' });
    req.flush({ token: 'jwt', expiresAt: '2999-01-01T00:00:00Z' });

    expect(localStorage.getItem('finans.session')).toContain('jwt');
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('401 yanıtında Türkçe hata mesajı gösterir', async () => {
    type('input[formControlName=username]', 'tunahan');
    type('input[formControlName=password]', 'yanlis');
    await submit();

    http.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('Kullanıcı adı veya şifre hatalı');
  });
});
