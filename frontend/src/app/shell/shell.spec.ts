import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Shell } from './shell';

@Component({ template: 'sayfa' })
class Page {}

describe('Shell', () => {
  async function render(url: string) {
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        // Kabuğun kendi router-outlet'i sayfayı gösterir; rotalar doğrudan onun altında.
        provideRouter([
          { path: 'harcamalar', component: Page },
          { path: 'harcamalar/yeni', component: Page, data: { fullscreen: true } },
          { path: 'yatirimlar', component: Page },
          { path: 'yatirimlar/islem', component: Page, data: { fullscreen: true } },
          { path: 'ayarlar', component: Page },
        ]),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Shell);
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function hrefs(el: HTMLElement, selector: string): (string | null)[] {
    return Array.from(el.querySelectorAll<HTMLAnchorElement>(selector)).map((a) => a.getAttribute('href'));
  }

  it('alt menüde Harcama, ekle ve Yatırım bağlantıları vardır', async () => {
    const el = await render('/harcamalar');

    expect(hrefs(el, 'nav.bottom a')).toEqual(['/harcamalar', '/harcamalar/yeni', '/yatirimlar']);
    expect(el.querySelector('nav.bottom a[aria-label="Harcama ekle"]')).not.toBeNull();
  });

  it('Yatırımlar bölümünde + işlem formunu açar', async () => {
    const el = await render('/yatirimlar');

    const add = el.querySelector<HTMLAnchorElement>('nav.bottom a.add')!;
    expect(add.getAttribute('href')).toBe('/yatirimlar/islem');
    expect(add.getAttribute('aria-label')).toBe('İşlem ekle');
  });

  it('aktif bölüm işaretlenir', async () => {
    const el = await render('/yatirimlar');

    const active = el.querySelector('nav.bottom a.active');
    expect(active?.getAttribute('href')).toBe('/yatirimlar');
  });

  it('tam ekran sayfalarda menü gizlenir', async () => {
    const el = await render('/harcamalar/yeni');

    expect(el.querySelector('nav.bottom')).toBeNull();
    expect(el.querySelector('nav.rail')).toBeNull();
  });

  it('geniş ekran yan rayında Ayarlar da vardır', async () => {
    const el = await render('/harcamalar');

    expect(hrefs(el, 'nav.rail a.item')).toEqual(['/harcamalar', '/yatirimlar', '/ayarlar']);
  });
});
