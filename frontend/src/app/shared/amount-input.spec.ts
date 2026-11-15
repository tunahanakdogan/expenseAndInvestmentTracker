import { parseAmount } from './amount-input';

describe('parseAmount', () => {
  it.each([
    ['1.234,56', '1234.56'],
    ['1234,5', '1234.5'],
    ['12', '12'],
    ['1.234', '1234'],
    ['1.234.567,8', '1234567.8'],
    [' 12,30 ', '12.30'],
    ['0,5', '0.5'],
  ])('%s → %s', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(['1,234.56', '12,345', '', '   ', 'abc', '-5', '0', '0,00', '1.23', '12.34,5', ',5', '1,'])(
    '%s reddedilir',
    (input) => {
      expect(parseAmount(input)).toBeNull();
    },
  );
});
