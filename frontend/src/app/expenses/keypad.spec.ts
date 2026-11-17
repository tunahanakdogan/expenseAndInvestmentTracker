import { groupAmount, keyFromEvent, pressKey } from './keypad';

describe('keypad', () => {
  it('rakam ekler', () => {
    expect(pressKey('', '1')).toBe('1');
    expect(pressKey('12', '3')).toBe('123');
  });

  it('baştaki sıfırı biriktirmez', () => {
    expect(pressKey('', '0')).toBe('0');
    expect(pressKey('0', '0')).toBe('0');
    expect(pressKey('0', '5')).toBe('5');
  });

  it('virgül en çok bir kez girilir ve boşken "0," olur', () => {
    expect(pressKey('', ',')).toBe('0,');
    expect(pressKey('12', ',')).toBe('12,');
    expect(pressKey('12,', ',')).toBe('12,');
    expect(pressKey('12,5', ',')).toBe('12,5');
  });

  it('en çok 2 ondalık', () => {
    expect(pressKey('12,', '5')).toBe('12,5');
    expect(pressKey('12,5', '0')).toBe('12,50');
    expect(pressKey('12,50', '9')).toBe('12,50');
    expect(pressKey('0,', '0')).toBe('0,0');
  });

  it('sil son karakteri kaldırır', () => {
    expect(pressKey('12,5', 'back')).toBe('12,');
    expect(pressKey('12,', 'back')).toBe('12');
    expect(pressKey('', 'back')).toBe('');
  });

  it('fiziksel tuşları eşler', () => {
    expect(keyFromEvent('7')).toBe('7');
    expect(keyFromEvent(',')).toBe(',');
    expect(keyFromEvent('Backspace')).toBe('back');
    expect(keyFromEvent('a')).toBeNull();
    expect(keyFromEvent('Enter')).toBeNull();
  });

  it('gösterimde binlik ayırıcı ekler', () => {
    expect(groupAmount('')).toBe('0');
    expect(groupAmount('1284,5')).toBe('1.284,5');
    expect(groupAmount('1234567,')).toBe('1.234.567,');
  });
});
