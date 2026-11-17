import { Routes } from '@angular/router';
import { ExpenseDetail } from './expense-detail';
import { ExpenseEntry } from './expense-entry';
import { ExpenseList } from './expense-list';

// 'yeni' ':id'den önce gelmeli. Tam ekran sayfalarda kabuk alt menüyü gizler.
export const EXPENSE_ROUTES: Routes = [
  { path: '', component: ExpenseList },
  { path: 'yeni', component: ExpenseEntry, data: { fullscreen: true } },
  { path: ':id', component: ExpenseDetail, data: { fullscreen: true } },
];
