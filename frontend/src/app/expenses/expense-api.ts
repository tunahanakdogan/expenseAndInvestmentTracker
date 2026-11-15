import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

// Tutarlar API'de string'dir ("1234.5600"); burada aritmetik yapılmaz (bkz. frontend/CLAUDE.md "Para").

/** Aylık listenin bir satırı: bir ödeme, ait olduğu harcamanın bilgisiyle. */
export interface PaymentRow {
  expenseId: number;
  installmentNo: number;
  installmentCount: number;
  amount: string;
  currency: string;
  expenseDate: string;
  description: string | null;
  categoryName: string;
  accountName: string;
}

export interface CurrencyTotal {
  currency: string;
  amount: string;
}

export interface PeriodPayments {
  period: string;
  payments: PaymentRow[];
  totals: CurrencyTotal[];
}

export interface ExpensePayment {
  installmentNo: number;
  /** 'YYYY-MM' */
  period: string;
  amount: string;
  status: string;
}

export interface Expense {
  id: number;
  accountId: number;
  accountName: string;
  categoryId: number;
  categoryName: string;
  description: string | null;
  date: string;
  totalAmount: string;
  currency: string;
  installmentCount: number;
  payments: ExpensePayment[];
}

export interface NewExpense {
  accountId: number;
  categoryId: number;
  amount: string;
  date: string;
  installmentCount: number;
  description: string | null;
}

@Injectable({ providedIn: 'root' })
export class ExpenseApi {
  private readonly http = inject(HttpClient);

  /** Dönemin ('YYYY-MM') ödemeleri ve para birimi başına toplamları. */
  list(period: string): Observable<PeriodPayments> {
    return this.http.get<PeriodPayments>('/api/expenses', { params: { period } });
  }

  get(id: number): Observable<Expense> {
    return this.http.get<Expense>(`/api/expenses/${id}`);
  }

  create(input: NewExpense): Observable<Expense> {
    return this.http.post<Expense>('/api/expenses', input);
  }

  updatePayment(id: number, installmentNo: number, amount: string): Observable<Expense> {
    return this.http.put<Expense>(`/api/expenses/${id}/payments/${installmentNo}`, { amount });
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`/api/expenses/${id}`);
  }
}
