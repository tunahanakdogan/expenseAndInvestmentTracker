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
    for (const text of ['Türk Hava Yolları', 'THYAO', '15', '110,60 ₺', '1.950,00 ₺', '%17,54', '13.11.2026']) {
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
    });

    expect(el.textContent).toContain('Henüz varlık yok');
  });

  it('yükleme hatasında uyarı gösterir', async () => {
    http.expectOne('/api/portfolio').flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('Portföy yüklenemedi');
  });

  it('işlem ekleme bağlantısı vardır', async () => {
    await load(FULL);

    expect(el.querySelector('a[aria-label="İşlem ekle"]')).not.toBeNull();
  });
});
