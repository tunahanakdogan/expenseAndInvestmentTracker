// Tuş takımı tutarı string olarak kurar ("1234,5"); sayıya çevrilmez (bkz. frontend/CLAUDE.md "Para").

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | ',' | 'back';

const MAX_INTEGER_DIGITS = 12;

/** Bir tuşa basınca yeni tutar metni: en çok bir virgül, en çok 2 ondalık, "0," dışında baştaki sıfır yok. */
export function pressKey(current: string, key: KeypadKey): string {
  if (key === 'back') {
    return current.slice(0, -1);
  }
  if (key === ',') {
    if (current.includes(',')) {
      return current;
    }
    return current === '' ? '0,' : current + ',';
  }
  const comma = current.indexOf(',');
  if (comma >= 0) {
    return current.length - comma - 1 >= 2 ? current : current + key;
  }
  if (current === '0') {
    return key;
  }
  return current.length >= MAX_INTEGER_DIGITS ? current : current + key;
}

/** Fiziksel klavye olayını tuşa çevirir; ilgisiz tuşlarda null. */
export function keyFromEvent(key: string): KeypadKey | null {
  if (/^[0-9]$/.test(key) || key === ',') {
    return key as KeypadKey;
  }
  return key === 'Backspace' ? 'back' : null;
}

/** "1234,5" → "1.234,5" (yalnız gösterim; tamsayı kısmına binlik ayırıcı). */
export function groupAmount(text: string): string {
  const [intPart, frac] = text.split(',');
  const grouped = (intPart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return frac === undefined ? grouped : `${grouped},${frac}`;
}
