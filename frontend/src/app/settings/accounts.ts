import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { apiErrorMessage } from '../expenses/amount-validator';
import { ACCOUNT_TYPE_LABELS, Account, AccountApi } from './account-api';
import { AccountForm } from './account-form';

@Component({
  selector: 'app-accounts',
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (loadFailed()) {
      <p class="empty">Hesaplar yüklenemedi</p>
      <button matButton (click)="load()">Tekrar dene</button>
    } @else if (accounts(); as list) {
      @if (list.length === 0) {
        <p class="empty">Henüz hesap yok</p>
      }
      <ul>
        @for (account of list; track account.id) {
          <li>
            <div class="text">
              <span class="name">{{ account.name }}</span>
              <span class="meta">
                {{ typeLabels[account.type] }} · {{ account.currency }}
                @if (account.statementDay !== null) {
                  · Kesim günü: {{ account.statementDay }}
                }
              </span>
            </div>
            <button matIconButton (click)="edit(account)" [attr.aria-label]="account.name + ' hesabını düzenle'">
              <mat-icon fontSet="material-symbols-outlined">edit</mat-icon>
            </button>
            <button matIconButton (click)="remove(account)" [attr.aria-label]="account.name + ' hesabını sil'">
              <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
            </button>
          </li>
        }
      </ul>
      <button matButton="tonal" class="add" (click)="edit(null)">Hesap ekle</button>
    }
  `,
  styles: `
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li {
      display: flex;
      align-items: center;
      min-height: 56px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .name {
      font: var(--mat-sys-body-large);
    }
    .meta,
    .empty {
      color: var(--mat-sys-on-surface-variant);
    }
    .add {
      margin-top: 12px;
      min-height: 48px;
    }
  `,
})
export class Accounts {
  private readonly api = inject(AccountApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly typeLabels = ACCOUNT_TYPE_LABELS;
  protected readonly accounts = signal<Account[] | null>(null);
  protected readonly loadFailed = signal(false);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loadFailed.set(false);
    this.api.list().subscribe({
      next: (list) => this.accounts.set(list),
      error: () => this.loadFailed.set(true),
    });
  }

  protected edit(account: Account | null): void {
    this.dialog
      .open<AccountForm, Account | null, boolean>(AccountForm, { data: account, width: '420px', maxWidth: '100vw' })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) {
          this.load();
        }
      });
  }

  protected remove(account: Account): void {
    if (!confirm(`"${account.name}" hesabı silinsin mi?`)) {
      return;
    }
    this.api.remove(account.id).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) =>
        this.snackBar.open(apiErrorMessage(err, 'Silinemedi, tekrar dene'), 'Tamam', { duration: 5000 }),
    });
  }
}
