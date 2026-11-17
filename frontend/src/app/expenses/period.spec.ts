import { currentPeriod, longDate, periodLabel, shiftPeriod, shortDate, statementPeriod, toIsoDate } from './period';

describe('period', () => {
  it('toIsoDate yerel günü verir, gece yarısından sonra UTC gününe kaymaz', () => {
    expect(toIsoDate(new Date(2026, 10, 15, 0, 30))).toBe('2026-11-15');
    expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('currentPeriod yerel ayı verir', () => {
    expect(currentPeriod(new Date(2026, 10, 15))).toBe('2026-11');
    expect(currentPeriod(new Date(2026, 0, 1, 0, 5))).toBe('2026-01');
  });

  it('shiftPeriod yıl sınırını geçer', () => {
    expect(shiftPeriod('2026-11', 1)).toBe('2026-12');
    expect(shiftPeriod('2026-12', 1)).toBe('2027-01');
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12');
  });

  it('periodLabel Türkçe ay adı ve yılı gösterir', () => {
    expect(periodLabel('2026-11')).toBe('Kasım 2026');
    expect(periodLabel('2027-01')).toBe('Ocak 2027');
  });

  it('shortDate ve longDate Türkçe gösterir', () => {
    expect(shortDate('2026-11-15')).toBe('15 Kas');
    expect(longDate('2026-10-08')).toBe('8 Ekim 2026');
  });

  it('statementPeriod kesim gününe göre ekstre ayını verir', () => {
    expect(statementPeriod('2026-11-15', 15)).toBe('2026-11');
    expect(statementPeriod('2026-11-16', 15)).toBe('2026-12');
    expect(statementPeriod('2026-12-20', 15)).toBe('2027-01');
    // Şubat'ta kesim günü 31 → ayın son günü (28).
    expect(statementPeriod('2026-02-28', 31)).toBe('2026-02');
  });
});
