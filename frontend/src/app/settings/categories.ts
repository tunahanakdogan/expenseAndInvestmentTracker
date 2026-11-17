import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { apiErrorMessage } from '../expenses/amount-validator';
import { Category, CategoryApi } from './category-api';

@Component({
  selector: 'app-categories',
  imports: [ReactiveFormsModule, MatIconModule],
  template: `
    <div class="head">
      <h2 id="kategoriler" class="app-label">Kategoriler</h2>
      @if (categories()) {
        <button type="button" class="add-open" (click)="newInput()?.nativeElement.focus()">+ Kategori</button>
      }
    </div>
    @if (loadFailed()) {
      <p class="empty">Kategoriler yüklenemedi</p>
      <button type="button" class="retry" (click)="load()">Tekrar dene</button>
    } @else if (categories(); as list) {
      @if (list.length > 0) {
        <ul class="app-card">
          @for (category of list; track category.id) {
            <li>
              @if (editingId() === category.id) {
                <form class="rename" (submit)="$event.preventDefault(); saveRename(category)">
                  <input
                    class="rename-input"
                    [formControl]="renameControl"
                    maxlength="40"
                    [attr.aria-label]="category.name + ' için yeni ad'"
                  />
                  <button type="submit" class="text-button">Kaydet</button>
                  <button type="button" class="text-button muted" (click)="editingId.set(null)">Vazgeç</button>
                </form>
              } @else {
                <span class="name">{{ category.name }}</span>
                <button
                  type="button"
                  class="row-button"
                  (click)="startRename(category)"
                  [attr.aria-label]="category.name + ' kategorisini yeniden adlandır'"
                >
                  <mat-icon fontSet="material-symbols-outlined">edit</mat-icon>
                </button>
                <button
                  type="button"
                  class="row-button danger"
                  (click)="remove(category)"
                  [attr.aria-label]="category.name + ' kategorisini sil'"
                >
                  <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
                </button>
              }
            </li>
          }
        </ul>
      }
      <form class="add" (submit)="$event.preventDefault(); add()">
        <input
          #newInputEl
          class="new-input"
          [formControl]="newName"
          maxlength="40"
          autocomplete="off"
          placeholder="Yeni kategori"
          aria-label="Yeni kategori"
        />
        <button type="submit" class="add-submit">Ekle</button>
      </form>
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
    .add-open,
    .retry,
    .add-submit {
      min-height: 44px;
      padding: 0 14px;
      border: none;
      border-radius: 22px;
      background: var(--app-accent-soft);
      color: var(--app-accent-text);
      font: 600 13px var(--app-font);
      cursor: pointer;
    }
    button:focus-visible,
    input:focus-visible {
      outline: 3px solid var(--app-accent-text);
      outline-offset: 2px;
    }
    ul {
      list-style: none;
      margin: 0 0 12px;
      padding: 2px 0;
    }
    li {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px 4px 16px;
      min-height: 52px;
      border-bottom: 1px solid var(--app-surface-2);
    }
    li:last-child {
      border-bottom: none;
    }
    .name {
      flex: 1;
      font-size: 15px;
      font-weight: 500;
    }
    .rename {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .rename-input,
    .new-input {
      flex: 1;
      min-width: 0;
      height: 44px;
      box-sizing: border-box;
      padding: 0 14px;
      font: 500 15px var(--app-font);
      color: var(--app-text);
      background: var(--app-surface);
      border: 1px solid var(--app-border);
      border-radius: var(--app-radius-input);
    }
    .rename-input {
      background: var(--app-surface-2);
    }
    .text-button {
      min-height: 44px;
      padding: 0 10px;
      border: none;
      background: transparent;
      color: var(--app-accent-text);
      font: 600 13px var(--app-font);
      cursor: pointer;
    }
    .text-button.muted {
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
    .add {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .empty {
      margin: 8px 0;
      color: var(--app-muted);
    }
  `,
})
export class Categories {
  private readonly api = inject(CategoryApi);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly newInput = viewChild<ElementRef<HTMLInputElement>>('newInputEl');
  protected readonly categories = signal<Category[] | null>(null);
  protected readonly loadFailed = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly newName = new FormControl('', { nonNullable: true });
  protected readonly renameControl = new FormControl('', { nonNullable: true });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loadFailed.set(false);
    this.api.list().subscribe({
      next: (list) => this.categories.set(list),
      error: () => this.loadFailed.set(true),
    });
  }

  protected add(): void {
    const name = this.newName.value.trim();
    if (name === '') {
      return;
    }
    this.api.create(name).subscribe({
      next: () => {
        this.newName.reset();
        this.load();
      },
      error: (err: HttpErrorResponse) => this.showError(err, 'Eklenemedi, tekrar dene'),
    });
  }

  protected startRename(category: Category): void {
    this.renameControl.setValue(category.name);
    this.editingId.set(category.id);
  }

  protected saveRename(category: Category): void {
    const name = this.renameControl.value.trim();
    if (name === '' || name === category.name) {
      this.editingId.set(null);
      return;
    }
    this.api.rename(category.id, name).subscribe({
      next: () => {
        this.editingId.set(null);
        this.load();
      },
      error: (err: HttpErrorResponse) => this.showError(err, 'Kaydedilemedi, tekrar dene'),
    });
  }

  protected remove(category: Category): void {
    if (!confirm(`"${category.name}" kategorisi silinsin mi?`)) {
      return;
    }
    this.api.remove(category.id).subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => this.showError(err, 'Silinemedi, tekrar dene'),
    });
  }

  private showError(err: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(apiErrorMessage(err, fallback), 'Tamam', { duration: 5000 });
  }
}
