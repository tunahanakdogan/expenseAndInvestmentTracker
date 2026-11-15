import { HttpErrorResponse } from '@angular/common/http';
import { FormControl } from '@angular/forms';
import { amountValidator, apiErrorMessage } from './amount-validator';

describe('amountValidator', () => {
  it.each(['', '12,5', '1.234,56', '0,01'])('"%s" geçerli', (value) => {
    expect(amountValidator(new FormControl(value))).toBeNull();
  });

  it.each(['abc', '0', '0,00', '1,234.56', '-5', '1,234'])('"%s" geçersiz', (value) => {
    expect(amountValidator(new FormControl(value))).toEqual({ amount: true });
  });
});

describe('apiErrorMessage', () => {
  it('422 yanıtında sunucunun mesajını döner', () => {
    const err = new HttpErrorResponse({ status: 422, error: { detail: 'X' } });
    expect(apiErrorMessage(err, 'Y')).toBe('X');
  });

  it('diğer hatalarda ve mesajsız 422 yanıtında varsayılanı döner', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 500, error: { detail: 'X' } }), 'Y')).toBe('Y');
    expect(apiErrorMessage(new HttpErrorResponse({ status: 422, error: null }), 'Y')).toBe('Y');
  });
});
