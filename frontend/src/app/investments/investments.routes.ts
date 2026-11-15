import { Routes } from '@angular/router';
import { ComingSoon } from '../shared/coming-soon';

// Yatırım parçası bu dosyayı kendi sayfalarıyla doldurur.
export const INVESTMENT_ROUTES: Routes = [{ path: '', component: ComingSoon, data: { title: 'Yatırımlar' } }];
