import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

/**
 * Giriş sonrası kabuk. Mobil: yüzen alt menü (Harcama · + · Yatırım), + bulunulan bölüme göre ekler.
 * ≥ 840 px: soldaki ray (Ayarlar dahil). Rota verisi `fullscreen: true` olan sayfalarda menü gizlenir.
 * Ayarlar'a mobilde sayfaların sağ üstündeki dişliden gidilir.
 */
@Component({
  selector: 'app-shell',
  imports: [MatIconModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    @if (!fullscreen()) {
      <nav class="rail" aria-label="Ana menü">
        <a class="add-rail" [routerLink]="add().link" [attr.aria-label]="add().label">
          <mat-icon fontSet="material-symbols-outlined">add</mat-icon>
          <span>Ekle</span>
        </a>
        @for (item of railItems; track item.link) {
          <a class="item" [routerLink]="item.link" routerLinkActive="active">
            <mat-icon fontSet="material-symbols-outlined">{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>
    }
    <main [class.with-nav]="!fullscreen()">
      <router-outlet />
    </main>
    @if (!fullscreen()) {
      <nav class="bottom" aria-label="Ana menü">
        <a
          [routerLink]="'/harcamalar'"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: false }"
          aria-label="Harcamalar"
        >
          <mat-icon fontSet="material-symbols-outlined">receipt_long</mat-icon>
          <span>Harcama</span>
        </a>
        <a class="add" [routerLink]="add().link" [attr.aria-label]="add().label">
          <mat-icon fontSet="material-symbols-outlined">add</mat-icon>
        </a>
        <a [routerLink]="'/yatirimlar'" routerLinkActive="active" aria-label="Yatırımlar">
          <mat-icon fontSet="material-symbols-outlined">trending_up</mat-icon>
          <span>Yatırım</span>
        </a>
      </nav>
    }
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
      background: var(--app-bg);
    }
    main {
      box-sizing: border-box;
      min-height: 100dvh;
    }
    main.with-nav {
      padding-bottom: calc(108px + env(safe-area-inset-bottom));
    }
    .bottom {
      position: fixed;
      left: 16px;
      right: 16px;
      bottom: calc(16px + env(safe-area-inset-bottom));
      z-index: 10;
      height: 68px;
      border-radius: 34px;
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      box-shadow: var(--app-shadow);
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0 8px;
      max-width: 480px;
      margin: 0 auto;
    }
    .bottom a {
      width: 64px;
      height: 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      text-decoration: none;
      color: var(--app-muted);
      font: 500 11px var(--app-font);
      border-radius: 16px;
    }
    .bottom a.active {
      color: var(--app-accent-text);
      font-weight: 600;
    }
    .bottom a.active mat-icon {
      font-variation-settings: 'FILL' 1;
    }
    .bottom a.add {
      width: 58px;
      height: 58px;
      border-radius: 29px;
      margin-top: -26px;
      background: var(--app-accent);
      color: var(--app-accent-ink);
      box-shadow: 0 8px 20px rgba(140, 180, 20, 0.3);
    }
    .bottom a.add mat-icon {
      font-size: 30px;
      width: 30px;
      height: 30px;
    }
    .bottom a:focus-visible,
    .rail a:focus-visible {
      outline: 3px solid var(--app-accent-text);
      outline-offset: 2px;
    }
    .rail {
      display: none;
    }
    /* Tablet / dar pencere: telefon düzeni, içerik ortada 640 px. */
    @media (min-width: 600px) and (max-width: 839px) {
      main.with-nav > :not(router-outlet) {
        display: block;
        max-width: 640px;
        margin: 0 auto;
      }
    }
    @media (min-width: 840px) {
      .bottom {
        display: none;
      }
      main.with-nav {
        padding-bottom: 0;
        margin-left: 112px;
      }
      /* Sayfa bileşeni (router-outlet'in kardeşi) en fazla 1200 px, ortalı. */
      main.with-nav > :not(router-outlet) {
        display: block;
        max-width: 1200px;
        margin: 0 auto;
      }
      .rail {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        width: 112px;
        box-sizing: border-box;
        padding: 24px 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        background: var(--app-surface);
        border-right: 1px solid var(--app-border);
      }
      .rail a {
        width: 88px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 10px 0;
        border-radius: 16px;
        text-decoration: none;
        color: var(--app-muted);
        font: 500 12px var(--app-font);
      }
      .rail a.active {
        color: var(--app-accent-text);
        background: var(--app-accent-soft);
        font-weight: 600;
      }
      .rail a.add-rail {
        margin-bottom: 16px;
        background: var(--app-accent);
        color: var(--app-accent-ink);
        font-weight: 700;
      }
    }
  `,
})
export class Shell {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly railItems = [
    { link: '/harcamalar', label: 'Harcamalar', icon: 'receipt_long' },
    { link: '/yatirimlar', label: 'Yatırımlar', icon: 'trending_up' },
    { link: '/ayarlar', label: 'Ayarlar', icon: 'settings' },
  ];

  private readonly navigation = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => ({ url: this.router.url, fullscreen: this.deepestData()['fullscreen'] === true })),
    ),
    { initialValue: { url: '', fullscreen: false } },
  );

  protected readonly fullscreen = computed(() => this.navigation().fullscreen);

  /** + bulunulan bölüme göre: Yatırımlar'da işlem formu, diğer her yerde hızlı harcama girişi. */
  protected readonly add = computed(() =>
    this.navigation().url.startsWith('/yatirimlar')
      ? { link: '/yatirimlar/islem', label: 'İşlem ekle' }
      : { link: '/harcamalar/yeni', label: 'Harcama ekle' },
  );

  private deepestData(): Record<string, unknown> {
    let route = this.route.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.data;
  }
}
