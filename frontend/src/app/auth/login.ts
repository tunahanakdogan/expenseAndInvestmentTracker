import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule],
  template: `
    <main>
      <mat-card appearance="outlined">
        <mat-card-header>
          <mat-card-title>Finans Takip</mat-card-title>
          <mat-card-subtitle>Giriş yap</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field>
              <mat-label>Kullanıcı adı</mat-label>
              <input matInput formControlName="username" autocomplete="username" autocapitalize="none" />
              @if (form.controls.username.hasError('required')) {
                <mat-error>Kullanıcı adı gerekli</mat-error>
              }
            </mat-form-field>
            <mat-form-field>
              <mat-label>Şifre</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="current-password" />
              @if (form.controls.password.hasError('required')) {
                <mat-error>Şifre gerekli</mat-error>
              }
            </mat-form-field>
            @if (error(); as message) {
              <p class="error" role="alert">{{ message }}</p>
            }
            <button matButton="filled" type="submit" [disabled]="loading()">
              {{ loading() ? 'Giriş yapılıyor…' : 'Giriş yap' }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </main>
  `,
  styles: `
    main {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 16px;
      box-sizing: border-box;
    }
    mat-card {
      width: 100%;
      max-width: 380px;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 16px;
    }
    button {
      height: 48px;
    }
    .error {
      color: var(--mat-sys-error);
      margin: 0 0 8px;
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
