import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';

interface Session {
  token: string;
  expiresAt: string;
}

const STORAGE_KEY = 'finans.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = signal<Session | null>(readStoredSession());

  isLoggedIn(): boolean {
    const s = this.session();
    return s !== null && new Date(s.expiresAt) > new Date();
  }

  token(): string | null {
    return this.isLoggedIn() ? this.session()!.token : null;
  }

  login(username: string, password: string): Observable<void> {
    return this.http.post<Session>('/api/auth/login', { username, password }).pipe(
      tap((s) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        this.session.set(s);
      }),
      map(() => undefined),
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
    this.router.navigateByUrl('/giris');
  }

  me(): Observable<{ username: string }> {
    return this.http.get<{ username: string }>('/api/auth/me');
  }
}

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
