import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Instrument } from './models';

@Injectable({ providedIn: 'root' })
export class InstrumentApi {
  private readonly http = inject(HttpClient);

  /** Hisse (BIST/ABD), fon, döviz ve altın araması; en çok 20 sonuç. */
  search(q: string): Observable<Instrument[]> {
    return this.http.get<Instrument[]>('/api/pricing/instruments', {
      params: new HttpParams().set('q', q),
    });
  }
}
