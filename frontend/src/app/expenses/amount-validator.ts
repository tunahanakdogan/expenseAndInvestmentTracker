import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { parseAmount } from '../shared/amount-input';

/**
 * tr-TR biçiminde, sıfırdan büyük, en çok 2 ondalıklı tutar. Boş değer geçerlidir
 * (zorunluluk ayrıca Validators.required ile istenir).
 */
export const amountValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  if (value === '') {
    return null;
  }
  return parseAmount(value) === null ? { amount: true } : null;
};

/** İş kuralı ihlalinde (422) backend'in Türkçe mesajı, diğer hatalarda `fallback`. */
export function apiErrorMessage(err: HttpErrorResponse, fallback: string): string {
  const detail = err.status === 422 ? err.error?.detail : null;
  return typeof detail === 'string' && detail !== '' ? detail : fallback;
}
