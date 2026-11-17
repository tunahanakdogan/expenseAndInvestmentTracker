// Saf string işlemleri: tutarlar sayıya çevrilmez (bkz. frontend/CLAUDE.md "Para").

/** Eksi işareti yalnız sıfırdan farklı değerde gösterilir ("-0.00" eksi sıfır değil, sıfırdır). */
function isNegative(value: string): boolean {
  return value.startsWith('-') && /[1-9]/.test(value);
}

/** "15.00000000" → "15", "1000.50000000" → "1000,5": sondaki sıfırlar atılır, ondalık ayırıcı virgül. */
export function formatDecimal(value: string): string {
  const digits = value.replace('-', '');
  const trimmed = digits.includes('.') ? digits.replace(/0+$/, '').replace(/\.$/, '') : digits;
  return `${isNegative(value) ? '-' : ''}${trimmed.replace('.', ',')}`;
}

/** "17.54" → "%17,54", "-3.10" → "-%3,10". */
export function formatPct(value: string | null): string {
  if (value == null) {
    return '';
  }
  return `${isNegative(value) ? '-' : ''}%${value.replace('-', '').replace('.', ',')}`;
}

/** Getiri rengi için sınıf; sıfır ve "yok" renksiz. */
export function gainClass(value: string | null): 'gain' | 'loss' | '' {
  if (value == null || !/[1-9]/.test(value)) {
    return '';
  }
  return isNegative(value) ? 'loss' : 'gain';
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

/** Kazançta "+" öneki; kayıpta eksi zaten değerin içinde, sıfırda önek yok. */
export function plus(value: string | null): '+' | '' {
  return gainClass(value) === 'gain' ? '+' : '';
}
