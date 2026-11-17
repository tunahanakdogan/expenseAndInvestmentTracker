import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme';

describe('ThemeService', () => {
  let systemDark: boolean;
  let listeners: Array<(e: { matches: boolean }) => void>;

  beforeEach(() => {
    localStorage.clear();
    systemDark = true;
    listeners = [];
    // jsdom'da matchMedia yok; sahtesiyle cihaz temasını biz belirliyoruz.
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () =>
        ({
          get matches() {
            return systemDark;
          },
          addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.push(fn),
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    });
    document.head.insertAdjacentHTML('beforeend', '<meta name="theme-color" content="">');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelector('meta[name=theme-color]')?.remove();
  });

  function theme(): string | null {
    return document.documentElement.getAttribute('data-theme');
  }

  it('varsayılan Sistem: cihaz koyuysa koyu uygular', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.mode()).toBe('system');
    expect(theme()).toBe('dark');
    expect(document.querySelector('meta[name=theme-color]')!.getAttribute('content')).toBe('#0e1116');
  });

  it('Sistem modunda cihaz teması değişince izler', () => {
    TestBed.inject(ThemeService);
    systemDark = false;
    listeners.forEach((fn) => fn({ matches: false }));

    expect(theme()).toBe('light');
    expect(document.querySelector('meta[name=theme-color]')!.getAttribute('content')).toBe('#f4f6f9');
  });

  it('seçim uygulanır ve saklanır; cihaz değişimi seçimi ezmez', () => {
    const service = TestBed.inject(ThemeService);
    service.set('light');

    expect(theme()).toBe('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    listeners.forEach((fn) => fn({ matches: true }));
    expect(theme()).toBe('light');
  });

  it('kayıtlı seçimle başlar', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    expect(TestBed.inject(ThemeService).mode()).toBe('light');
    expect(theme()).toBe('light');
  });

  it('bozuk kayıt veya erişilemeyen depolamada Sistem kullanılır', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'mor');
    expect(TestBed.inject(ThemeService).mode()).toBe('system');

    TestBed.resetTestingModule();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('engelli');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('engelli');
    });
    const service = TestBed.inject(ThemeService);
    expect(service.mode()).toBe('system');
    expect(() => service.set('dark')).not.toThrow();
    expect(theme()).toBe('dark');
  });
});
