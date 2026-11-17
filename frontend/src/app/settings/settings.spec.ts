import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../shared/theme';
import { Settings } from './settings';

describe('Settings', () => {
  let fixture: ComponentFixture<Settings>;
  let http: HttpTestingController;
  let el: HTMLElement;
  let theme: ThemeService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    theme = TestBed.inject(ThemeService);
    theme.set('system');
    fixture = TestBed.createComponent(Settings);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    await fixture.whenStable();
    http.match('/api/accounts').forEach((r) => r.flush([]));
    http.match('/api/categories').forEach((r) => r.flush([]));
    http.expectOne('/api/auth/me').flush({ username: 'tunahan' });
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const radios = () => Array.from(el.querySelectorAll<HTMLButtonElement>('[role=radio]'));

  it('tema seçicisi geçerli modu gösterir', () => {
    expect(radios().map((r) => r.textContent!.trim())).toEqual(['Sistem', 'Koyu', 'Açık']);
    expect(radios().map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
  });

  it('karta tıklayınca ThemeService.set çağrılır ve seçim güncellenir', async () => {
    const set = vi.spyOn(theme, 'set');
    radios()[2].click();
    await fixture.whenStable();

    expect(set).toHaveBeenCalledWith('light');
    expect(radios()[2].getAttribute('aria-checked')).toBe('true');
    expect(radios()[0].getAttribute('aria-checked')).toBe('false');
  });

  it('oturum kullanıcı adını gösterir', () => {
    expect(el.textContent).toContain('Oturum: tunahan');
  });

  it('Çıkış yap AuthService.logout çağırır', () => {
    const logout = vi.spyOn(TestBed.inject(AuthService), 'logout').mockImplementation(() => undefined);
    const button = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent!.trim() === 'Çıkış yap',
    )!;
    button.click();

    expect(logout).toHaveBeenCalled();
  });

  it('geri butonu .app-mobile-only taşır ve iki sütunlu kapsayıcı vardır', () => {
    const back = el.querySelector('a[aria-label="Geri"]')!;
    expect(back.classList.contains('app-mobile-only')).toBe(true);
    const grid = el.querySelector('.grid')!;
    expect(grid).toBeTruthy();
    expect(grid.querySelector('.gorunum')).toBeTruthy();
    expect(grid.querySelector('.hesaplar')).toBeTruthy();
    expect(grid.querySelector('.kategoriler')).toBeTruthy();
    expect(grid.querySelector('.oturum')).toBeTruthy();
  });
});
