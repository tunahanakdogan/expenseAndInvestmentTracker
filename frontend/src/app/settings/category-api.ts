import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface Category {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class CategoryApi {
  private readonly http = inject(HttpClient);

  /** Kullanıcının hiç kategorisi yoksa backend ilk çağrıda varsayılanları oluşturur. */
  list(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/categories');
  }

  create(name: string): Observable<Category> {
    return this.http.post<Category>('/api/categories', { name });
  }

  rename(id: number, name: string): Observable<Category> {
    return this.http.put<Category>(`/api/categories/${id}`, { name });
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`/api/categories/${id}`);
  }
}
