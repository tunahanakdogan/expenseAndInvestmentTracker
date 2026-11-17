import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeTr from '@angular/common/locales/tr';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Portfolio as PortfolioData, PortfolioItem } from './models';
import { Portfolio } from './portfolio';

registerLocaleData(localeTr);

const THYAO: PortfolioItem = {
  assetId: 1,
  type: 'BIST_STOCK',
  symbol: 'THYAO',
  name: 'Türk Hava Yolları',
  currency: 'TRY',
  quantity: '15.00000000',
  averageCost: '110.6000',
  costBasis: '1659.0000',
  currentPrice: '130.00000000',
  priceDate: '2026-11-13',
  marketValue: '1950.0000',
  unrealizedGain: '291.0000',
  unrealizedGainPct: '17.54',
  realizedGain: '194.0000',
  costBasisTry: null,
  averageCostTry: null,
  marketValueTry: null,
  unrealizedGainTry: null,
  unrealizedGainPctTry: null,
  realizedGainTry: null,
};

const AAPL: PortfolioItem = {
  assetId: 2,
  type: 'US_STOCK',
  symbol: 'AAPL',
  name: 'Apple',
  currency: 'USD',
  quantity: '3.00000000',
  averageCost: '225.5000',
  costBasis: '676.5000',
  currentPrice: '310.00000000',
  priceDate: '2026-11-13',
  marketValue: '930.0000',
  unrealizedGain: '253.5000',
  unrealizedGainPct: '37.47',
  realizedGain: '72.5000',
  costBasisTry: '21798.0000',
  averageCostTry: '7266.0000',
  marketValueTry: '38130.0000',
  unrealizedGainTry: '16332.0000',
  unrealizedGainPctTry: '74.92',
  realizedGainTry: '4654.0000',
};

const FULL: PortfolioData = {
  totalCostTry: '23457.0000',
  totalMarketValueTry: '40080.0000',
  totalUnrealizedGainTry: '16623.0000',
  totalUnrealizedGainPctTry: '70.87',
  missingPrices: false,
  assets: [AAPL, THYAO],
  allocation: [
    { type: 'US_STOCK', valueTry: '38130.0000', sharePct: '95.14' },
    { type: 'BIST_STOCK', valueTry: '1950.0000', sharePct: '4.86' },
  ],
};

describe('Portfolio', () => {
  let fixture: ComponentFixture<Portfolio>;
  let http: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Portfolio],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'tr-TR' },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Portfolio);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  async function load(portfolio: PortfolioData) {
    http.expectOne('/api/portfolio').flush(portfolio);
    await fixture.whenStable();
  }

  function cards(): HTMLElement[] {
    return Array.from(el.querySelectorAll<HTMLElement>('[data-testid=asset-card]'));
  }

  it('toplamları ve varlık kartlarını gösterir', async () => {
    await load(FULL);

    expect(el.textContent).toContain('40.080,00 ₺');
    expect(el.textContent).toContain('16.623,00 ₺');
    expect(el.textContent).toContain('%70,87');
    expect(cards()).toHaveLength(2);

    const thyao = cards()[1];
    for (const text of [
      'Türk Hava Yolları',
      'THYAO',
      '15',
      '110,60 ₺',
      '1.950,00 ₺',
      '%17,54',
      '13.11.2026',
    ]) {
      expect(thyao.textContent).toContain(text);
    }
    expect(thyao.querySelector('.gain')?.textContent).toContain('%17,54');
    expect(thyao.querySelector('.loss')).toBeNull();
  });

  it('ABD hissesinde USD ve TRY değerini birlikte gösterir', async () => {
    await load(FULL);

    const aapl = cards()[0];
    for (const text of ['930,00 $', '%37,47', '38.130,00 ₺', '%74,92']) {
      expect(aapl.textContent).toContain(text);
    }
  });

  it('zarardaki varlığı loss sınıfıyla gösterir', async () => {
    await load({
      ...FULL,
      assets: [{ ...THYAO, unrealizedGain: '-100.0000', unrealizedGainPct: '-6.03' }],
    });

    const loss = cards()[0].querySelector('.loss');
    expect(loss?.textContent).toContain('-%6,03');
  });

  it('fiyatı olmayan varlıkta "Fiyat yok" ve uyarı gösterir', async () => {
    await load({
      ...FULL,
      missingPrices: true,
      assets: [
        {
          ...THYAO,
          currentPrice: null,
          priceDate: null,
          marketValue: null,
          unrealizedGain: null,
          unrealizedGainPct: null,
        },
      ],
    });

    expect(cards()[0].textContent).toContain('Fiyat yok');
    expect(cards()[0].textContent).toContain('15');
    expect(el.textContent).toContain('Bazı varlıkların fiyatı yok');
  });

  it('boş portföyde yönlendirme metni gösterir', async () => {
    await load({
      totalCostTry: '0.0000',
      totalMarketValueTry: '0.0000',
      totalUnrealizedGainTry: '0.0000',
      totalUnrealizedGainPctTry: null,
      missingPrices: false,
      assets: [],
      allocation: [],
    });

    expect(el.textContent).toContain('Henüz varlık yok');
  });

  it('yükleme hatasında uyarı gösterir', async () => {
    http.expectOne('/api/portfolio').flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('Portföy yüklenemedi');
  });

  it('eski FAB yok; ayarlar bağlantısı var', async () => {
    await load(FULL);

    expect(el.querySelector('a[aria-label="İşlem ekle"]')).toBeNull();
    expect(el.querySelector('a[aria-label="Ayarlar"]')?.getAttribute('href')).toBe('/ayarlar');
  });

  it('dağılım çubuğunu allocation alanından çizer', async () => {
    await load(FULL);

    const segments = Array.from(el.querySelectorAll<HTMLElement>('[data-testid=alloc-segment]'));
    expect(segments).toHaveLength(2);
    expect(segments[0].textContent).toContain('ABD %95,14');
    expect(segments[0].style.flex).toContain('95.14');
    expect(segments[0].className).toContain('seg-0');
    expect(segments[1].textContent?.trim()).toBe('%4,86');
    expect(segments[1].className).toContain('seg-1');
    expect(el.querySelector('.strip')?.getAttribute('aria-label')).toBe(
      'Varlık dağılımı: ABD %95,14, BIST %4,86',
    );
    const legend = Array.from(el.querySelectorAll('[data-testid=alloc-legend]'));
    expect(legend.map((l) => l.textContent?.trim())).toEqual(['ABD', 'BIST']);
  });

  it('allocation boşsa çubuk gösterilmez', async () => {
    await load({ ...FULL, allocation: [] });

    expect(el.querySelector('[data-testid=alloc-segment]')).toBeNull();
  });

  it('kazanç rozeti artı işaretiyle ve maliyetle gösterilir', async () => {
    await load(FULL);

    const badge = el.querySelector('[data-testid=gain-badge]')!;
    expect(badge.textContent).toContain('+16.623,00 ₺');
    expect(badge.textContent).toContain('%70,87');
    expect(badge.classList).not.toContain('loss-badge');
    expect(el.textContent).toContain('maliyet 23.457,00 ₺');
  });

  it('zarar rozeti loss-badge varyantını kullanır', async () => {
    await load({
      ...FULL,
      totalUnrealizedGainTry: '-500.0000',
      totalUnrealizedGainPctTry: '-2.09',
    });

    const badge = el.querySelector('[data-testid=gain-badge]')!;
    expect(badge.classList).toContain('loss-badge');
    expect(badge.textContent).toContain('-500,00 ₺');
    expect(badge.textContent).not.toContain('+');
  });

  describe('Fiyatları güncelle', () => {
    function refreshButton(): HTMLButtonElement {
      return el.querySelector<HTMLButtonElement>('button[aria-label="Fiyatları güncelle"]')!;
    }

    async function clickRefresh() {
      refreshButton().click();
      await fixture.whenStable();
    }

    function status(): string | undefined {
      return el.querySelector('[role=status]')?.textContent?.trim();
    }

    it('fiyatları yeniler, portföyü yeniden yükler ve sonucu gösterir', async () => {
      await load(FULL);
      await clickRefresh();

      const req = http.expectOne('/api/pricing/refresh');
      expect(req.request.method).toBe('POST');
      expect(refreshButton().disabled).toBe(true);
      expect(status()).toContain('Fiyatlar güncelleniyor');

      req.flush({ updatedPrices: 2, updatedRates: 20, failed: [] });
      await fixture.whenStable();
      await load({ ...FULL, totalMarketValueTry: '41000.0000' });

      expect(el.textContent).toContain('41.000,00 ₺');
      expect(status()).toBe('Fiyatlar güncellendi');
      expect(refreshButton().disabled).toBe(false);
    });

    it('alınamayan fiyatları sembol adlarıyla bildirir', async () => {
      await load(FULL);
      await clickRefresh();
      http
        .expectOne('/api/pricing/refresh')
        .flush({ updatedPrices: 1, updatedRates: 0, failed: ['RATES', 'FUND:AFT', 'BIST_STOCK:THYAO'] });
      await fixture.whenStable();
      await load(FULL);

      expect(status()).toBe('Fiyatlar güncellendi. Alınamayanlar: kurlar, AFT, THYAO');
    });

    it('çok sık basılınca backend mesajını gösterir', async () => {
      await load(FULL);
      await clickRefresh();
      http
        .expectOne('/api/pricing/refresh')
        .flush({ detail: 'Biraz bekleyip tekrar dene' }, { status: 429, statusText: 'Too Many Requests' });
      await fixture.whenStable();

      expect(status()).toBe('Biraz bekleyip tekrar dene');
      expect(refreshButton().disabled).toBe(false);
    });

    it('diğer hatalarda genel mesaj gösterir', async () => {
      await load(FULL);
      await clickRefresh();
      http.expectOne('/api/pricing/refresh').flush(null, { status: 500, statusText: 'Error' });
      await fixture.whenStable();

      expect(status()).toBe('Fiyatlar güncellenemedi, tekrar dene');
    });
  });

  describe('web düzeni (CSS kırılma noktasına göre gösterilir)', () => {
    function rows(): HTMLElement[] {
      return Array.from(el.querySelectorAll<HTMLElement>('[data-testid=asset-row]'));
    }

    it('varlıkları 7 sütunlu tabloda gösterir', async () => {
      await load(FULL);

      const headers = Array.from(el.querySelectorAll('table th')).map((h) => h.textContent?.trim());
      expect(headers).toEqual([
        'Varlık', 'Tür', 'Adet', 'Ort. maliyet', 'Güncel', 'Değer', 'Getiri',
      ]);
      expect(rows()).toHaveLength(2);
      const thyao = rows()[1];
      for (const text of [
        'Türk Hava Yolları', 'THYAO', '13.11.2026', 'BIST hissesi', '15', '110,60 ₺', '130,00 ₺',
        '1.950,00 ₺', '+%17,54',
      ]) {
        expect(thyao.textContent).toContain(text);
      }
      expect(thyao.querySelector('a')?.getAttribute('href')).toBe('/varlik/1');
      expect(thyao.querySelectorAll('td')[6].querySelector('.gain')).not.toBeNull();
    });

    it('ABD hissesinde TRY değer ve getiriyi ikinci satırda gösterir', async () => {
      await load(FULL);

      const cells = rows()[0].querySelectorAll('td');
      expect(cells[5].textContent).toContain('930,00 $');
      expect(cells[5].querySelector('.second')?.textContent).toContain('38.130,00 ₺');
      expect(cells[6].querySelector('.second')?.textContent).toContain('%74,92');
    });

    it('fiyatı olmayan satırda "Fiyat yok" gösterir; zararı loss sınıfıyla', async () => {
      await load({
        ...FULL,
        assets: [
          { ...THYAO, currentPrice: null, marketValue: null, unrealizedGain: null, unrealizedGainPct: null },
          { ...AAPL, unrealizedGain: '-5.0000', unrealizedGainPct: '-1.00' },
        ],
      });

      expect(rows()[0].textContent).toContain('Fiyat yok');
      expect(rows()[1].querySelector('.loss')?.textContent).toContain('-%1,00');
    });

    it('üç özet kartını gösterir', async () => {
      await load(FULL);

      const total = el.querySelector('[data-testid=sum-total]')!.textContent;
      expect(total).toContain('Toplam değer');
      expect(total).toContain('40.080,00 ₺');
      expect(el.querySelector('[data-testid=sum-cost]')!.textContent).toContain('23.457,00 ₺');
      const gain = el.querySelector('[data-testid=sum-gain]')!;
      expect(gain.textContent).toContain('+16.623,00 ₺');
      expect(gain.textContent).toContain('%70,87');
      expect(gain.classList).not.toContain('loss-card');
    });

    it('zararda getiri kartı loss-card varyantını kullanır', async () => {
      await load({ ...FULL, totalUnrealizedGainTry: '-500.0000', totalUnrealizedGainPctTry: '-2.09' });

      const gain = el.querySelector('[data-testid=sum-gain]')!;
      expect(gain.classList).toContain('loss-card');
      expect(gain.textContent).toContain('-500,00 ₺');
    });

    it('dağılım şeridinde her dilim etiketlidir', async () => {
      await load(FULL);

      const segs = Array.from(el.querySelectorAll('[data-testid=alloc-segment-web]'));
      expect(segs.map((s) => s.textContent?.trim())).toEqual(['ABD %95,14', 'BIST %4,86']);
    });

    it('başlık ve etiketli yenileme düğmesi vardır', async () => {
      await load(FULL);

      expect(el.querySelector('h1')?.textContent).toContain('Yatırımlar');
      const button = el.querySelector('button[aria-label="Fiyatları güncelle"]')!;
      expect(button.textContent).toContain('Fiyatları güncelle');
    });
  });
});
