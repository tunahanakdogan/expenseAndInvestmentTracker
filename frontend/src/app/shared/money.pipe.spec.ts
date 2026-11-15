import { MoneyPipe } from './money.pipe';

describe('MoneyPipe', () => {
  const pipe = new MoneyPipe();

  it.each([
    ['1234.5600', 'TRY', '1.234,56 ₺'],
    ['1234.5650', 'TRY', '1.234,56 ₺'],
    ['1234.5750', 'TRY', '1.234,58 ₺'],
    ['-0.0050', 'TRY', '0,00 ₺'],
    ['1000000', 'TRY', '1.000.000,00 ₺'],
    ['0.995', 'TRY', '1,00 ₺'],
    ['-1234.5', 'TRY', '-1.234,50 ₺'],
    ['999.995', 'TRY', '1.000,00 ₺'],
    ['1234.5', 'USD', '1.234,50 $'],
    ['1234.5', 'EUR', '1.234,50 €'],
    ['1234.5', 'GBP', '1.234,50 GBP'],
    ['12345678901234567.8900', 'TRY', '12.345.678.901.234.567,89 ₺'],
  ])('%s %s → %s', (amount, currency, expected) => {
    expect(pipe.transform(amount, currency)).toBe(expected);
  });

  it('boş değerde boş string döner', () => {
    expect(pipe.transform(null, 'TRY')).toBe('');
    expect(pipe.transform(undefined, 'TRY')).toBe('');
  });
});
