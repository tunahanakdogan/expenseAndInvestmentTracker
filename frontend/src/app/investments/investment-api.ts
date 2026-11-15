import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { InvestmentTransaction, NewTransaction, Portfolio } from './models';

@Injectable({ providedIn: 'root' })
export class InvestmentApi {
  private readonly http = inject(HttpClient);

  portfolio(): Observable<Portfolio> {
    return this.http.get<Portfolio>('/api/portfolio');
  }

  transactions(assetId: number): Observable<InvestmentTransaction[]> {
    return this.http.get<InvestmentTransaction[]>('/api/investments/transactions', {
      params: new HttpParams().set('assetId', assetId),
    });
  }

  create(transaction: NewTransaction): Observable<InvestmentTransaction> {
    return this.http.post<InvestmentTransaction>('/api/investments/transactions', transaction);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/api/investments/transactions/${id}`);
  }

  /** O günün (yoksa önceki en yakın günün) USD/TRY kuru; hiç kur yoksa null. */
  usdRate(date: string): Observable<string | null> {
    return this.http
      .get<{ rateTry: string }>('/api/pricing/rate', {
        params: new HttpParams().set('currency', 'USD').set('date', date),
      })
      .pipe(
        map((r) => r.rateTry),
        catchError((err: HttpErrorResponse) => (err.status === 404 ? of(null) : throwError(() => err))),
      );
  }
}
