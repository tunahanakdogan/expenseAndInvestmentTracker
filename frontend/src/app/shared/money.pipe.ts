import { Pipe, PipeTransform } from '@angular/core';

const SYMBOLS: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };

/**
 * API'den gelen string tutarı ("1234.5600") tr-TR biçiminde gösterir: "1.234,56 ₺".
 * Sayıya çevirmeden, string üzerinde 2 haneye HALF_EVEN yuvarlar (backend ile aynı kural).
 */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(amount: string | null | undefined, currency: string): string {
    if (amount == null || amount === '') {
      return '';
    }
    const { negative, intPart, fracPart } = roundHalfEven(amount);
    const isZero = /^0*$/.test(intPart + fracPart);
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const sign = negative && !isZero ? '-' : '';
    return `${sign}${grouped},${fracPart} ${SYMBOLS[currency] ?? currency}`;
  }
}

function roundHalfEven(amount: string): { negative: boolean; intPart: string; fracPart: string } {
  const negative = amount.startsWith('-');
  const [rawInt, rawFrac = ''] = amount.replace(/^[-+]/, '').split('.');
  const frac = rawFrac.padEnd(3, '0');
  const kept = frac.slice(0, 2);
  const rest = frac.slice(2);

  const lastKeptDigit = Number(kept[1]);
  const roundUp =
    rest[0] > '5' ||
    (rest[0] === '5' && (/[1-9]/.test(rest.slice(1)) || lastKeptDigit % 2 === 1));

  let digits = (rawInt || '0') + kept;
  if (roundUp) {
    digits = incrementDigits(digits);
  }
  const intPart = digits.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
  return { negative, intPart, fracPart: digits.slice(-2) };
}

/** "0999" → "1000"; sayıya çevirmeden +1. */
function incrementDigits(digits: string): string {
  const chars = digits.split('');
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i] === '9') {
      chars[i] = '0';
    } else {
      chars[i] = String(Number(chars[i]) + 1);
      return chars.join('');
    }
  }
  return '1' + chars.join('');
}
