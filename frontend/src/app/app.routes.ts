import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'giris', loadComponent: () => import('./auth/login').then((m) => m.Login) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'harcamalar' },
      {
        path: 'harcamalar',
        loadChildren: () => import('./expenses/expenses.routes').then((m) => m.EXPENSE_ROUTES),
      },
      {
        path: 'yatirimlar',
        loadChildren: () => import('./investments/investments.routes').then((m) => m.INVESTMENT_ROUTES),
      },
      {
        path: 'ayarlar',
        loadChildren: () => import('./settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
