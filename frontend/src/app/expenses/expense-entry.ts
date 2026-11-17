import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { parseAmount } from '../shared/amount-input';
import { Account, AccountApi } from '../settings/account-api';
import { Category, CategoryApi } from '../settings/category-api';
import { apiErrorMessage } from './amount-validator';
import { ExpenseApi } from './expense-api';
import { KeypadKey, groupAmount, keyFromEvent, pressKey } from './keypad';
import { periodLabel, shortDate, statementPeriod, toIsoDate } from './period';

export const LAST_ACCOUNT_KEY = 'finans.lastAccountId';

const CURRENCY_SYMBOLS: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };

/**
 * Hızlı harcama girişi (tam ekran rota). Mutlu yol: tutar (tuş takımı) → kategori → Kaydet;
 * hesap, taksit ve tarih varsayılanlıdır. Kaydedince listeye döner.
 */
@Component({
  selector: 'app-expense-entry',
  imports: [MatIconModule, RouterLink],
  host: { '(document:keydown)': 'onKeydown($event)' },
  template: `
    <header>
      <a class="app-icon-button" routerLink="/harcamalar" aria-label="Kapat">
        <mat-icon fontSet="material-symbols-outlined">close</mat-icon>
      </a>
      <span class="title">Harcama ekle</span>
      <label class="date">
        {{ dateLabel() }}
        <input type="date" [value]="date()" (input)="onDate($event)" aria-label="Tarih" />
      </label>
    </header>

    @if (loadFailed()) {
      <div class="state">
        <p>Hesaplar ve kategoriler yüklenemedi</p>
        <button type="button" class="app-chip retry" (click)="load()">Tekrar dene</button>
      </div>
    } @else if (accounts(); as accountList) {
      @if (accountList.length === 0) {
        <div class="state">
          <p>Önce Ayarlar'dan bir hesap ekle.</p>
          <a routerLink="/ayarlar">Ayarlar'a git</a>
        </div>
      } @else {
        <div class="display">
          <span class="amount app-num" [class.empty]="amountText() === ''" aria-live="polite">
            {{ amountDisplay() }}<span class="symbol"> {{ currencySymbol() }}</span>
          </span>
          @if (accountNote(); as note) {
            <span class="note">{{ note }}</span>
          }
          @if (amountError(); as message) {
            <span class="error">{{ message }}</span>
          }
        </div>

        <div class="group">
          <span class="app-label" id="category-label">Kategori</span>
          <div class="chips" role="group" aria-labelledby="category-label">
            @for (category of categories(); track category.id) {
              <button
                type="button"
                class="app-chip"
                [attr.aria-pressed]="categoryId() === category.id"
                (click)="categoryId.set(category.id)"
              >
                {{ category.name }}
              </button>
            }
          </div>
          @if (submitted() && categoryId() === null) {
            <span class="error">Kategori seç</span>
          }
        </div>

        <div class="group">
          <span class="app-label" id="account-label">Hesap</span>
          <div class="chips" role="group" aria-labelledby="account-label">
            @for (account of accountList; track account.id) {
              <button
                type="button"
                class="app-chip"
                [attr.aria-pressed]="selectedAccount()?.id === account.id"
                (click)="selectAccount(account)"
              >
                {{ account.name }}
              </button>
            }
            @if (selectedAccount()?.type === 'CREDIT_CARD') {
              <select
                class="app-chip installments"
                aria-label="Taksit"
                [value]="installmentCount()"
                (change)="onInstallments($event)"
              >
                @for (count of installmentOptions; track count) {
                  <option [value]="count" [selected]="count === installmentCount()">
                    {{ count === 1 ? 'Peşin' : 'Taksit: ' + count }}
                  </option>
                }
              </select>
            }
          </div>
        </div>

        <input
          class="description"
          aria-label="Açıklama (opsiyonel)"
          placeholder="Açıklama (opsiyonel)"
          maxlength="200"
          autocomplete="off"
          [value]="description()"
          (input)="onDescription($event)"
        />

        <div class="keypad">
          @for (key of keys; track key.key) {
            <button type="button" [attr.aria-label]="key.label" (click)="press(key.key)">{{ key.text }}</button>
          }
        </div>

        @if (error(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }
        <button type="button" class="app-primary save" [disabled]="saving()" (click)="submit()">
          {{ saving() ? 'Kaydediliyor…' : 'Kaydet' }}
        </button>
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-sizing: border-box;
      min-height: 100dvh;
      max-width: 480px;
      margin: 0 auto;
      padding: 18px 20px calc(24px + env(safe-area-inset-bottom));
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .title {
      font-size: 15px;
      font-weight: 600;
    }
    .date {
      position: relative;
      min-height: 44px;
      box-sizing: border-box;
      padding: 0 14px;
      border: 1px solid var(--app-border);
      border-radius: 22px;
      background: var(--app-surface);
      font: 500 13px var(--app-font);
      display: inline-flex;
      align-items: center;
    }
    .date:focus-within {
      outline: 3px solid var(--app-accent-text);
      outline-offset: 2px;
    }
    .date input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }
    .display {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 10px 0 4px;
    }
    .amount {
      font-size: 56px;
      font-weight: 700;
      letter-spacing: -1px;
      line-height: 1.1;
      max-width: 100%;
      overflow-wrap: anywhere;
      text-align: center;
    }
    .amount.empty {
      color: var(--app-muted);
    }
    .symbol {
      font-size: 36px;
      color: var(--app-muted);
    }
    .note {
      font-size: 13px;
      color: var(--app-muted);
    }
    .error {
      margin: 0;
      font-size: 13px;
      color: var(--app-danger);
    }
    .group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    /* Tek satır, yana kayar: Kaydet butonu telefonda ekranda kalsın (tek elle giriş). */
    .chips {
      display: flex;
      flex-wrap: nowrap;
      gap: 8px;
      overflow-x: auto;
      margin: 0 -20px;
      padding: 0 20px 2px;
      scrollbar-width: none;
    }
    .chips::-webkit-scrollbar {
      display: none;
    }
    .chips > * {
      flex: none;
    }
    .installments {
      appearance: none;
      text-align: center;
    }
    .description {
      box-sizing: border-box;
      height: 44px;
      padding: 0 14px;
      border: 1px solid var(--app-border);
      border-radius: var(--app-radius-input);
      background: var(--app-surface);
      color: var(--app-text);
      font: 400 14px var(--app-font);
    }
    .description:focus-visible {
      outline: 3px solid var(--app-accent-text);
      outline-offset: 2px;
    }
    .keypad {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: auto;
    }
    .keypad button {
      height: 58px;
      border: 1px solid var(--app-border);
      border-radius: 16px;
      background: var(--app-surface);
      color: var(--app-text);
      font: 500 24px var(--app-font-num);
      cursor: pointer;
    }
    .keypad button:active {
      background: var(--app-surface-2);
    }
    .keypad button:focus-visible {
      outline: 3px solid var(--app-accent-text);
      outline-offset: 2px;
    }
    .save {
      height: 58px;
    }
    .state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 64px 0;
      color: var(--app-muted);
    }
    .state p {
      margin: 0;
    }
  `,
})
export class ExpenseEntry {
  private readonly accountApi = inject(AccountApi);
  private readonly categoryApi = inject(CategoryApi);
  private readonly expenseApi = inject(ExpenseApi);
  private readonly router = inject(Router);

  protected readonly installmentOptions = Array.from({ length: 36 }, (_, i) => i + 1);
  protected readonly keys: { key: KeypadKey; text: string; label: string }[] = [
    ...(['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const).map((d) => ({ key: d, text: d, label: d })),
    { key: ',', text: ',', label: 'Virgül' },
    { key: '0', text: '0', label: '0' },
    { key: 'back', text: '⌫', label: 'Sil' },
  ];

  protected readonly accounts = signal<Account[] | null>(null);
  protected readonly categories = signal<Category[]>([]);
  protected readonly loadFailed = signal(false);
  protected readonly selectedAccount = signal<Account | null>(null);
  protected readonly categoryId = signal<number | null>(null);
  protected readonly installmentCount = signal(1);
  protected readonly date = signal(toIsoDate(new Date()));
  protected readonly description = signal('');
  protected readonly amountText = signal('');
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly amountDisplay = computed(() => groupAmount(this.amountText()));
  protected readonly dateLabel = computed(() =>
    this.date() === toIsoDate(new Date()) ? 'Bugün' : this.date() === '' ? 'Tarih' : shortDate(this.date()),
  );
  protected readonly currencySymbol = computed(() => {
    const currency = this.selectedAccount()?.currency ?? '';
    return CURRENCY_SYMBOLS[currency] ?? currency;
  });
  /** Tutar alanı altı: kredi kartında ilk ekstre ayı, diğer hesaplarda hesap adı. */
  protected readonly accountNote = computed(() => {
    const account = this.selectedAccount();
    if (!account) {
      return null;
    }
    if (account.type === 'CREDIT_CARD' && account.statementDay !== null && this.date() !== '') {
      return `${account.name} · ekstre ${periodLabel(statementPeriod(this.date(), account.statementDay))}`;
    }
    return account.name;
  });
  protected readonly amountError = computed(() => {
    if (!this.submitted()) {
      return null;
    }
    if (this.amountText() === '') {
      return 'Tutar gerekli';
    }
    return this.parsedAmount() === null ? 'Geçerli bir tutar gir' : null;
  });

  /** Sondaki virgül ("12,") yazım halidir; doğrulamadan önce atılır. */
  private parsedAmount(): string | null {
    return parseAmount(this.amountText().replace(/,$/, ''));
  }

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loadFailed.set(false);
    forkJoin([this.accountApi.list(), this.categoryApi.list()]).subscribe({
      next: ([accounts, categories]) => {
        this.categories.set(categories);
        this.accounts.set(accounts);
        if (accounts.length > 0) {
          // Son kullanılan hesap; silinmişse (ya da ilk kullanımda) ilk hesap.
          const last = readLastAccountId();
          this.selectAccount(accounts.find((a) => String(a.id) === last) ?? accounts[0]);
        }
      },
      error: () => this.loadFailed.set(true),
    });
  }

  protected press(key: KeypadKey): void {
    this.amountText.update((current) => pressKey(current, key));
  }

  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (event.ctrlKey || event.metaKey || event.altKey || target?.matches('input, select, textarea')) {
      return;
    }
    const key = keyFromEvent(event.key);
    if (key && this.accounts()?.length) {
      this.press(key);
    }
  }

  protected selectAccount(account: Account): void {
    this.selectedAccount.set(account);
    if (account.type !== 'CREDIT_CARD') {
      // Taksit yalnız kredi kartında; seçenek gizlenince eski seçim gönderilmesin.
      this.installmentCount.set(1);
    }
  }

  protected onInstallments(event: Event): void {
    this.installmentCount.set(Number((event.target as HTMLSelectElement).value));
  }

  protected onDate(event: Event): void {
    this.date.set((event.target as HTMLInputElement).value);
  }

  protected onDescription(event: Event): void {
    this.description.set((event.target as HTMLInputElement).value);
  }

  protected submit(): void {
    this.submitted.set(true);
    const amount = this.parsedAmount();
    const account = this.selectedAccount();
    const categoryId = this.categoryId();
    if (amount === null || categoryId === null || account === null || this.date() === '') {
      return;
    }
    if (this.saving()) {
      return;
    }
    const description = this.description().trim();
    this.saving.set(true);
    this.error.set(null);
    this.expenseApi
      .create({
        accountId: account.id,
        categoryId,
        amount,
        date: this.date(),
        installmentCount: this.installmentCount(),
        description: description === '' ? null : description,
      })
      .subscribe({
        next: () => {
          storeLastAccountId(String(account.id));
          this.router.navigate(['/harcamalar']);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.error.set(apiErrorMessage(err, 'Kaydedilemedi, tekrar dene'));
        },
      });
  }
}

// Gizli sekmede ya da depolama engellenmişse localStorage hata fırlatır; son hesap yalnız bir kolaylıktır,
// okunamaz ya da yazılamazsa form ilk hesapla çalışmaya devam eder.
function readLastAccountId(): string | null {
  try {
    return localStorage.getItem(LAST_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

function storeLastAccountId(accountId: string): void {
  try {
    localStorage.setItem(LAST_ACCOUNT_KEY, accountId);
  } catch {
    // Saklanamadı; bir sonraki girişte ilk hesap varsayılan olur.
  }
}
