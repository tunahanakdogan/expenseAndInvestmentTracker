import { INVESTMENT_ROUTES } from './investments.routes';

describe('INVESTMENT_ROUTES', () => {
  it('işlem formu ve varlık geçmişi tam ekran (alt menüsüz) açılır', () => {
    for (const path of ['islem', 'varlik/:id']) {
      expect(INVESTMENT_ROUTES.find((r) => r.path === path)?.data).toEqual({ fullscreen: true });
    }
  });

  it('portföy ana sayfası alt menüyü korur', () => {
    expect(INVESTMENT_ROUTES.find((r) => r.path === '')?.data).toBeUndefined();
  });
});
