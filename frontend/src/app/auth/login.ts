import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <main>
      <div class="brand">
        <span class="logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <path d="M3 17l6-6 4 4 8-8" />
            <path d="M15 7h6v6" />
          </svg>
        </span>
        <h1>Finans Takip</h1>
        <p>Harcamaların ve yatırımların tek yerde.</p>
      </div>
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label>
          <span class="app-label">Kullanıcı adı</span>
          <input
            formControlName="username"
            autocomplete="username"
            autocapitalize="none"
            [attr.aria-invalid]="showError('username')"
          />
          @if (showError('username')) {
            <span class="field-error">Kullanıcı adı gerekli</span>
          }
        </label>
        <label>
          <span class="app-label">Şifre</span>
          <input
            type="password"
            formControlName="password"
            autocomplete="current-password"
            [attr.aria-invalid]="showError('password')"
          />
          @if (showError('password')) {
            <span class="field-error">Şifre gerekli</span>
          }
        </label>
        @if (error(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }
        <button class="app-primary" type="submit" [disabled]="loading()">
          {{ loading() ? 'Giriş yapılıyor…' : 'Giriş yap' }}
        </button>
      </form>
    </main>
  `,
  styles: `
    main {
      min-height: 100dvh;
      box-sizing: border-box;
      max-width: 420px;
      margin: 0 auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 28px;
    }
    .brand {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .logo {
      width: 56px;
      height: 56px;
      border-radius: 18px;
      background: var(--app-accent);
      color: var(--app-accent-ink);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    h1 {
      margin: 0;
      font: 700 34px var(--app-font-num);
      letter-spacing: -0.5px;
    }
    .brand p {
      margin: 0;
      font-size: 15px;
      color: var(--app-muted);
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    input {
      height: 52px;
      box-sizing: border-box;
      padding: 0 14px;
      border-radius: var(--app-radius-input);
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      color: var(--app-text);
      font: 500 16px var(--app-font);
    }
    input:focus-visible {
      border-color: var(--app-accent-text);
      outline: 2px solid var(--app-accent-text);
      outline-offset: 1px;
    }
    input[aria-invalid='true'] {
      border-color: var(--app-danger);
    }
    .field-error,
    .error {
      margin: 0;
      font-size: 13px;
      color: var(--app-danger);
    }
    .app-primary {
      margin-top: 6px;
    }
    @media (min-width: 840px) {
      main {
        max-width: 400px;
        min-height: 0;
        margin: max(48px, 12dvh) auto;
        padding: 32px;
        background: var(--app-surface);
        border: 1px solid var(--app-border);
        border-radius: 24px;
        justify-content: flex-start;
      }
    }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(NonNullableFormBuilder).group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected showError(name: 'username' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);
    this.auth.login(username, password).subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(
          err.status === 401 ? 'Kullanıcı adı veya şifre hatalı' : 'Sunucuya ulaşılamadı, tekrar dene',
        );
      },
    });
  }
}
