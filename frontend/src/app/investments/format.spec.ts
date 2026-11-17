import { formatDecimal, formatPct, gainClass, parseDecimal, todayIso } from './format';

describe('formatDecimal', () => {
  it.each([
    ['15.00000000', '15'],
    ['0.12345678', '0,12345678'],
    ['1000.50000000', '1.000,5'],
    ['50000.00000000', '50.000'],
    ['1234567.12500000', '1.234.567,125'],
    ['100', '100'],
    ['0.00000000', '0'],
    ['-0.00000000', '0'],
    ['-1.50000000', '-1,5'],
  ])('%s → %s', (value, expected) => {
    expect(formatDecimal(value)).toBe(expected);
  });
});

describe('formatPct', () => {
  it.each([
    ['17.54', '%17,54'],
    ['-3.10', '-%3,10'],
    ['-0.00', '%0,00'],
    ['0.00', '%0,00'],
    [null, ''],
  ])('%s → %s', (value, expected) => {
    expect(formatPct(value)).toBe(expected);
  });
});

describe('gainClass', () => {
  it.each([
    ['291.0000', 'gain'],
    ['-12.5000', 'loss'],
    ['0.0000', ''],
    ['-0.0000', ''],
    [null, ''],
  ])('%s → "%s"', (value, expected) => {
    expect(gainClass(value)).toBe(expected);
  });
});

describe('parseDecimal', () => {
  it.each([
    ['0,12345678', 8, '0.12345678'],
    [' 12,5 ', 8, '12.5'],
    ['12', 8, '12'],
  ])('%s (%i hane) → %s', (input, maxFraction, expected) => {
    expect(parseDecimal(input, maxFraction)).toBe(expected);
  });

  it.each([
    // Nokta binlik mi ondalık mı belli değil: "1.234" sessizce 1234 ya da 1,234 olmasın.
    ['1.234', 8],
    ['0.5', 8],
    ['1.234,56', 8],
    ['1,234.5', 8],
    ['0,123456789', 8],
    ['1,23456', 4],
    ['', 8],
    ['abc', 8],
    ['-5', 8],
    [',5', 8],
    ['5,', 8],
  ])('%s (%i hane) reddedilir', (input, maxFraction) => {
    expect(parseDecimal(input, maxFraction)).toBeNull();
  });
});

describe('todayIso', () => {
  afterEach(() => vi.useRealTimers());

  it("UTC değil İstanbul'un gününü verir", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T22:30:00Z'));

    expect(todayIso()).toBe('2026-11-16');
  });
});
