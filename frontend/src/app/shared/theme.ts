import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'system' | 'dark' | 'light';
export const THEME_STORAGE_KEY = 'finans.theme';

const META_COLOR = { dark: '#0e1116', light: '#f4f6f9' } as const;

/**
 * Sistem · Koyu · Açık tema seçimi. Seçim cihaz başına localStorage'da; <html data-theme> ile uygulanır.
 * İlk boyamadaki karar index.html'deki satır içi betikte aynı kuralla verilir.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  // Eski tarayıcı / test ortamında matchMedia olmayabilir: Sistem o durumda açık sayılır.
  private readonly media =
    typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  readonly mode = signal<ThemeMode>(readStoredMode());

  constructor() {
    this.media?.addEventListener('change', () => {
      if (this.mode() === 'system') {
        this.apply();
      }
    });
    this.apply();
  }

  set(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Depolama kapalıysa seçim yalnız bu oturumda geçerli.
    }
    this.apply();
  }

  private apply(): void {
    const mode = this.mode();
    const resolved = mode === 'system' ? (this.media?.matches ? 'dark' : 'light') : mode;
    document.documentElement.setAttribute('data-theme', resolved);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', META_COLOR[resolved]);
  }
}

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'dark' || stored === 'light' ? stored : 'system';
  } catch {
    return 'system';
  }
}
