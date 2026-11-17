// Dönem = 'YYYY-MM' string'i. Buradaki aritmetik tarih aritmetiğidir, para değil.

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Yerel yıl/ay/günden 'yyyy-MM-dd'. toISOString() kullanılmaz: UTC'ye çevirdiği için
 * İstanbul'da 00:00–03:00 arasında dünün tarihini verir.
 */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function currentPeriod(today: Date): string {
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
}

export function shiftPeriod(period: string, delta: number): string {
  const [year, month] = period.split('-').map(Number);
  return currentPeriod(new Date(year, month - 1 + delta, 1));
}

/** '2026-11' → 'Kasım 2026' */
export function periodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  return new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function parseIso(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** 'yyyy-MM-dd' → '15 Kas' */
export function shortDate(date: string): string {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(parseIso(date)).replace('.', '');
}

/** 'yyyy-MM-dd' → '8 Ekim 2026' */
export function longDate(date: string): string {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(parseIso(date));
}

/**
 * Kredi kartı harcamasının ilk ekstre dönemi (docs/domain.md): etkin kesim günü = min(kesim günü, ayın son günü);
 * harcama günü ≤ etkin kesim günü ise harcama ayı, değilse sonraki ay.
 */
export function statementPeriod(date: string, statementDay: number): string {
  const d = parseIso(date);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const effective = Math.min(statementDay, lastDay);
  return shiftPeriod(currentPeriod(d), d.getDate() <= effective ? 0 : 1);
}
