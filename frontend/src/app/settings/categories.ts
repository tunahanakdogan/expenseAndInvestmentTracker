import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { apiErrorMessage } from '../expenses/amount-validator';
import { Category, CategoryApi } from './category-api';

@Component({
  selector: 'app-categories',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    @if (loadFailed()) {
      <p class="empty">Kategoriler yüklenemedi</p>
      <button matButton (click)="load()">Tekrar dene</button>
    } @else if (categories(); as list) {
      <ul>
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
                <button matButton type="submit">Kaydet</button>
                <button matButton type="button" (click)="editingId.set(null)">Vazgeç</button>
              </form>
            } @else {
              <span class="name">{{ category.name }}</span>
              <button
                matIconButton
                (click)="startRename(category)"
                [attr.aria-label]="category.name + ' kategorisini yeniden adlandır'"
              >
                <mat-icon fontSet="material-symbols-outlined">edit</mat-icon>
              </button>
              <button matIconButton (click)="remove(category)" [attr.aria-label]="category.name + ' kategorisini sil'">
                <mat-icon fontSet="material-symbols-outlined">delete</mat-icon>
              </button>
            }
          </li>
        }
      </ul>
      <form class="add" (submit)="$event.preventDefault(); add()">
        <mat-form-field subscriptSizing="dynamic">
          <mat-label>Yeni kategori</mat-label>
          <input matInput [formControl]="newName" maxlength="40" autocomplete="off" />
        </mat-form-field>
        <button matButton="tonal" type="submit">Ekle</button>
      </form>
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
      min-height: 48px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .name {
      flex: 1;
      font: var(--mat-sys-body-large);
    }
    .rename {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .rename-input {
      flex: 1;
      min-width: 0;
      height: 40px;
      padding: 0 8px;
      font: var(--mat-sys-body-large);
      color: inherit;
      background: transparent;
      border: 1px solid var(--mat-sys-outline);
      border-radius: 4px;
    }
    .add {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
    }
    .add mat-form-field {
      flex: 1;
    }
    .add button {
      min-height: 48px;
    }
    .empty {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class Categories {
  private readonly api = inject(CategoryApi);
  private readonly snackBar = inject(MatSnackBar);

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
