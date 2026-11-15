// tr-TR: binlik ayırıcı ".", ondalık ","; en fazla 2 ondalık.
const TR_AMOUNT = /^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/;

/**
 * Kullanıcının yazdığı tutarı API'ye gidecek string'e çevirir: "1.234,56" → "1234.56".
 * Geçersiz, sıfır veya negatifse null. Sayıya çevirmez (bkz. frontend/CLAUDE.md "Para").
 */
export function parseAmount(input: string): string | null {
  const value = input.trim();
  if (!TR_AMOUNT.test(value)) {
    return null;
  }
  const normalized = value.replace(/\./g, '').replace(',', '.');
  return /[1-9]/.test(normalized) ? normalized : null;
}
