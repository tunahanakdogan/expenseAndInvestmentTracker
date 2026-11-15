// Saf string işlemleri: tutarlar sayıya çevrilmez (bkz. frontend/CLAUDE.md "Para").

/** "15.00000000" → "15", "1000.50000000" → "1000,5": sondaki sıfırlar atılır, ondalık ayırıcı virgül. */
export function formatDecimal(value: string): string {
  const trimmed = value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value;
  return trimmed.replace('.', ',');
}

/** "17.54" → "%17,54", "-3.10" → "-%3,10". */
export function formatPct(value: string | null): string {
  if (value == null) {
    return '';
  }
  const negative = value.startsWith('-');
  return `${negative ? '-' : ''}%${value.replace('-', '').replace('.', ',')}`;
}

/** Getiri rengi için sınıf; sıfır ve "yok" renksiz. */
export function gainClass(value: string | null): 'gain' | 'loss' | '' {
  if (value == null || !/[1-9]/.test(value)) {
    return '';
  }
  return value.startsWith('-') ? 'loss' : 'gain';
}

/**
 * Kullanıcının yazdığı adet/fiyat/kuru API string'ine çevirir: "0,125" → "0.125".
 * Ondalık ayırıcı yalnız virgül; nokta içeren giriş reddedilir ("1.234" binlik mi ondalık mı belli değil,
 * sessizce 1000 kat hata olmasın). Geçersizse null.
 */
export function parseDecimal(input: string, maxFraction: number): string | null {
  const value = input.trim();
  return new RegExp(`^\\d+(,\\d{1,${maxFraction}})?$`).test(value) ? value.replace(',', '.') : null;
}

/** Bugünün tarihi (YYYY-MM-DD) kullanıcının saat diliminde; gece yarısından sonra UTC bir gün geride kalır. */
export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
