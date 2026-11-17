import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { apiErrorMessage } from '../expenses/amount-validator';
import { ACCOUNT_TYPE_LABELS, Account, AccountApi } from './account-api';
import { AccountForm } from './account-form';

@Component({
  selector: 'app-accounts',
  imports: [MatIconModule],
  template: `
    <div class="head">
      <h2 id="hesaplar" class="app-label">Hesaplar</h2>
      @if (accounts()) {
        <button type="button" class="add" (click)="edit(null)">+ Hesap ekle</button>
      }
    </div>
    @if (loadFailed()) {
      <p class="empty">Hesaplar yüklenemedi</p>
      <button type="button" class="retry" (click)="load()">Tekrar dene</button>
    } @else if (accounts(); as list) {
      @if (list.length === 0) {
        <p class="empty">Henüz hesap yok</p>
      } @else {
        <ul class="app-card">
          @for (account of list; track account.id) {
            <li>
              <span class="icon app-num" aria-hidden="true">{{ initials(account.name) }}</span>
              <div class="text">
                <span class="name">{{ account.name }}</span>
                <span class="meta">
                  {{ typeLabels[account.type] }} · {{ account.currency }}
                  @if (account.statementDay !== null) {
                    · Kesim günü: {{ account.statementDay }}
                  }
                </span>
              </div>
              <button
                type="button"
                class="row-button"
                (click)="edit(account)"
                [attr.aria-label]="account.name + ' hesabını düzenle'"
              >
                <mat-icon fontSet="material-symbols-outlined">edit</mat-icon>
              </button>
              <button
                type="button"
                class="row-button danger"
                (click)="remove(account)"
                [attr.aria-label]="account.name + ' hesabını sil'"
              >
                <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
              </button>
            </li>
          }
        </ul>
      }
    }
  `,
  styles: `
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 44px;
    }
    h2 {
      margin: 0;
      font-weight: 500;
    }
    .add,
    .retry {
      min-height: 44px;
      padding: 0 14px;
      border: none;
      border-radius: 22px;
      background: var(--app-accent-soft);
      color: var(--app-accent-text);
      font: 600 13px var(--app-font);
      cursor: pointer;
    }
    button:focus-visible {
      outline: 3px solid var(--app-accent-text);
      outline-offset: 2px;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 2px 0;
    }
    li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 8px 6px 16px;
      min-height: 56px;
      border-bottom: 1px solid var(--app-surface-2);
    }
    li:last-child {
      border-bottom: none;
    }
    .icon {
      flex: none;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--app-accent-soft);
      color: var(--app-accent-text);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
    }
    .text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .name {
      font-size: 15px;
      font-weight: 500;
    }
    .meta {
      font-size: 12px;
      color: var(--app-muted);
    }
    .empty {
      margin: 8px 0;
      font-size: 14px;
      color: var(--app-muted);
    }
    .row-button {
      flex: none;
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 22px;
      background: transparent;
      color: var(--app-muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .row-button.danger {
      color: var(--app-danger);
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

  protected initials(name: string): string {
    return name.trim().slice(0, 2).toLocaleUpperCase('tr-TR');
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
