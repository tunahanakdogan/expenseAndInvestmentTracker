import { Routes } from '@angular/router';

export const INVESTMENT_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./portfolio').then((m) => m.Portfolio) },
  {
    path: 'varlik/:id',
    loadComponent: () => import('./asset-transactions').then((m) => m.AssetTransactions),
  },
];
