import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ThemeMode, ThemeService } from '../shared/theme';
import { Accounts } from './accounts';
import { Categories } from './categories';

@Component({
  selector: 'app-settings',
  imports: [Accounts, Categories, MatIconModule, RouterLink],
  template: `
    <header>
      <a class="app-icon-button app-mobile-only" routerLink="/harcamalar" aria-label="Geri">
        <mat-icon fontSet="material-symbols-outlined" aria-hidden="true">arrow_back</mat-icon>
      </a>
      <h1>Ayarlar</h1>
    </header>

    <div class="grid">
    <section class="gorunum" aria-labelledby="gorunum">
      <h2 id="gorunum" class="app-label">Görünüm</h2>
      <div class="themes" role="radiogroup" aria-label="Tema">
        @for (option of options; track option.mode) {
          <button
            type="button"
            role="radio"
            class="theme"
            [class.checked]="theme.mode() === option.mode"
            [attr.aria-checked]="theme.mode() === option.mode"
            [tabindex]="theme.mode() === option.mode ? 0 : -1"
            (click)="theme.set(option.mode)"
            (keydown)="onKey($event, option.mode)"
          >
            <span class="preview" [class]="'preview ' + option.mode" aria-hidden="true">
              <span class="bar accent"></span>
              <span class="bar line"></span>
            </span>
            {{ option.label }}
          </button>
        }
      </div>
      <p class="hint">Sistem: telefonun açık/koyu ayarını izler.</p>
    </section>

    <section class="hesaplar" aria-labelledby="hesaplar">
      <app-accounts />
    </section>

    <section class="kategoriler" aria-labelledby="kategoriler">
      <app-categories />
    </section>

    <footer class="oturum">
      <div class="session">
        @if (username(); as name) {
          <span>Oturum: {{ name }}</span>
        } @else {
          <span></span>
        }
        <span>Finans Takip</span>
      </div>
      <button type="button" class="logout" (click)="auth.logout()">Çıkış yap</button>
    </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
      max-width: 560px;
      margin: 0 auto;
      padding: 18px 0 32px;
    }
    header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 16px;
    }
    h1 {
      margin: 0;
      font: 600 15px var(--app-font);
    }
    section {
      padding: 22px 16px 0;
    }
    h2 {
      margin: 0;
      font-weight: 500;
    }
    .themes {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .theme {
      min-height: 92px;
      box-sizing: border-box;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      border: 2px solid var(--app-border);
      border-radius: 16px;
      background: var(--app-surface);
      color: var(--app-text);
      font: 600 13px var(--app-font);
      cursor: pointer;
    }
    .theme.checked {
      border-color: var(--app-accent-text);
    }
    .theme:focus-visible {
      outline: 3px solid var(--app-accent-text);
      outline-offset: 2px;
    }
    /* Önizleme kutuları seçili temadan bağımsız: sabit koyu / açık renkler. */
    .preview {
      flex: 1;
      border-radius: 10px;
      display: flex;
      align-items: flex-end;
      gap: 4px;
      padding: 6px;
      background: #eef1f5;
    }
    .preview.dark {
      background: #0e1116;
    }
    .preview.system {
      background: linear-gradient(90deg, #f4f6f9 50%, #0e1116 50%);
    }
    .bar {
      height: 6px;
      border-radius: 3px;
    }
    .bar.accent {
      width: 18px;
      background: #c6f432;
    }
    .bar.line {
      width: 26px;
      background: #9aa4b2;
    }
    .hint {
      margin: 10px 0 0;
      font-size: 12px;
      color: var(--app-muted);
    }
    footer {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 32px 16px 0;
    }
    .session {
      display: flex;
      justify-content: space-between;
      padding: 0 4px;
      font-size: 13px;
      color: var(--app-muted);
    }
    .logout {
      height: 52px;
      border: 1px solid var(--app-border);
      border-radius: 16px;
      background: var(--app-surface);
      color: var(--app-text);
      font: 600 15px var(--app-font);
      cursor: pointer;
    }
    @media (min-width: 840px) {
      :host {
        max-width: 1200px;
        padding: 28px 24px 40px;
      }
      header {
        padding: 0;
      }
      h1 {
        font: 700 24px var(--app-font);
      }
      .grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        grid-template-rows: auto auto 1fr;
        grid-template-areas:
          'gorunum kategoriler'
          'hesaplar kategoriler'
          'oturum kategoriler';
        column-gap: 32px;
      }
      section {
        padding: 22px 0 0;
      }
      .gorunum { grid-area: gorunum; }
      .hesaplar { grid-area: hesaplar; }
      .kategoriler { grid-area: kategoriler; }
      .oturum {
        grid-area: oturum;
        align-self: start;
        padding: 32px 0 0;
      }
    }
    .logout:focus-visible {
      outline: 3px solid var(--app-accent-text);
      outline-offset: 2px;
    }
  `,
})
export class Settings {
  protected readonly theme = inject(ThemeService);
  protected readonly auth = inject(AuthService);
  protected readonly username = signal<string | null>(null);

  protected readonly options: { mode: ThemeMode; label: string }[] = [
    { mode: 'system', label: 'Sistem' },
    { mode: 'dark', label: 'Koyu' },
    { mode: 'light', label: 'Açık' },
  ];

  constructor() {
    this.auth.me().subscribe({
      next: (me) => this.username.set(me.username),
      error: () => this.username.set(null),
    });
  }

  /** Ok tuşları radiogroup'ta seçimi taşır (Tab + Enter/Boşluk zaten düğme olarak çalışır). */
  protected onKey(event: KeyboardEvent, mode: ThemeMode): void {
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    if (!forward && !backward) {
      return;
    }
    event.preventDefault();
    const count = this.options.length;
    const index = this.options.findIndex((o) => o.mode === mode);
    const nextIndex = (index + (forward ? 1 : -1) + count) % count;
    this.theme.set(this.options[nextIndex].mode);
    const radios = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLElement>('[role=radio]');
    radios?.[nextIndex]?.focus();
  }
}
