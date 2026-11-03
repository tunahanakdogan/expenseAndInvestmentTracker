import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'giris', loadComponent: () => import('./auth/login').then((m) => m.Login) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  { path: '**', redirectTo: '' },
];
