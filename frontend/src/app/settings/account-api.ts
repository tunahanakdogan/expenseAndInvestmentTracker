import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type AccountType = 'CASH' | 'BANK' | 'CREDIT_CARD';

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  currency: string;
  /** Yalnız kredi kartında dolu (1–31). */
  statementDay: number | null;
}

export type AccountInput = Omit<Account, 'id'>;

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CASH: 'Nakit',
  BANK: 'Banka',
  CREDIT_CARD: 'Kredi Kartı',
};

@Injectable({ providedIn: 'root' })
export class AccountApi {
  private readonly http = inject(HttpClient);

  list(): Observable<Account[]> {
    return this.http.get<Account[]>('/api/accounts');
  }

  create(input: AccountInput): Observable<Account> {
    return this.http.post<Account>('/api/accounts', input);
  }

  update(id: number, input: AccountInput): Observable<Account> {
    return this.http.put<Account>(`/api/accounts/${id}`, input);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`/api/accounts/${id}`);
  }
}
