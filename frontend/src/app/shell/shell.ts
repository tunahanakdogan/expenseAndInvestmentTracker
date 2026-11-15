import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/** Giriş sonrası tüm ekranların kabuğu: mobilde alt menü, geniş ekranda yan menü. */
@Component({
  selector: 'app-shell',
  imports: [MatButtonModule, MatIconModule, MatToolbarModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <mat-toolbar>
      <span class="title">Finans Takip</span>
      <button matIconButton (click)="auth.logout()" aria-label="Çıkış yap">
        <mat-icon fontSet="material-symbols-outlined">logout</mat-icon>
      </button>
    </mat-toolbar>
    <nav aria-label="Ana menü">
      @for (item of items; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active" [attr.aria-label]="item.label">
          <mat-icon fontSet="material-symbols-outlined">{{ item.icon }}</mat-icon>
          <span>{{ item.label }}</span>
        </a>
      }
    </nav>
    <main>
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100dvh;
    }
    mat-toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .title {
      flex: 1;
    }
    nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 2;
      display: flex;
      height: 64px;
      padding-bottom: env(safe-area-inset-bottom);
      background: var(--mat-sys-surface-container);
      border-top: 1px solid var(--mat-sys-outline-variant);
    }
    nav a {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      color: var(--mat-sys-on-surface-variant);
      text-decoration: none;
      font: var(--mat-sys-label-medium);
    }
    nav a.active {
      color: var(--mat-sys-primary);
    }
    nav a.active mat-icon {
      font-variation-settings: 'FILL' 1;
    }
    main {
      padding: 16px 16px calc(80px + env(safe-area-inset-bottom));
    }
    @media (min-width: 840px) {
      nav {
        top: 64px;
        right: auto;
        width: 96px;
        height: auto;
        flex-direction: column;
        justify-content: flex-start;
        padding: 16px 0 0;
        border-top: none;
        border-right: 1px solid var(--mat-sys-outline-variant);
      }
      nav a {
        flex: none;
        height: 72px;
      }
      main {
        margin-left: 96px;
        padding: 24px;
        max-width: 960px;
      }
    }
  `,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly items = [
    { path: '/harcamalar', label: 'Harcamalar', icon: 'receipt_long' },
    { path: '/yatirimlar', label: 'Yatırımlar', icon: 'trending_up' },
    { path: '/ayarlar', label: 'Ayarlar', icon: 'settings' },
  ];
}
