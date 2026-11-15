import { Routes } from '@angular/router';
import { ComingSoon } from '../shared/coming-soon';

// Harcama parçası bu dosyayı kendi sayfalarıyla doldurur.
export const EXPENSE_ROUTES: Routes = [{ path: '', component: ComingSoon, data: { title: 'Harcamalar' } }];
