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
