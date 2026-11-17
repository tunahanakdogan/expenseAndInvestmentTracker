import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { InstrumentApi } from './instrument-api';

describe('InstrumentApi', () => {
  it('aramayı q parametresiyle ister', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    let result: unknown;

    TestBed.inject(InstrumentApi).search('türk hava').subscribe((r) => (result = r));
    const req = http.expectOne((r) => r.url === '/api/pricing/instruments');
    expect(req.request.params.get('q')).toBe('türk hava');
    req.flush([{ type: 'BIST_STOCK', symbol: 'THYAO', name: 'Türk Hava Yolları', exchange: 'IST' }]);

    expect(result).toEqual([{ type: 'BIST_STOCK', symbol: 'THYAO', name: 'Türk Hava Yolları', exchange: 'IST' }]);
    http.verify();
  });
});
