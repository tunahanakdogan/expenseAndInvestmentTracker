import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Shell } from './shell';

describe('Shell', () => {
  async function render() {
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('üç ana bölümün bağlantılarını gösterir', async () => {
    const el = await render();
    const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('nav a')).map((a) => [
      a.textContent?.trim(),
      a.getAttribute('href'),
    ]);

    expect(links).toEqual([
      [expect.stringContaining('Harcamalar'), '/harcamalar'],
      [expect.stringContaining('Yatırımlar'), '/yatirimlar'],
      [expect.stringContaining('Ayarlar'), '/ayarlar'],
    ]);
  });

  it('çıkış butonu oturumu kapatır', async () => {
    const el = await render();
    const logout = vi.spyOn(TestBed.inject(AuthService), 'logout').mockImplementation(() => {});

    el.querySelector<HTMLButtonElement>('button[aria-label="Çıkış yap"]')!.click();

    expect(logout).toHaveBeenCalled();
  });
});
