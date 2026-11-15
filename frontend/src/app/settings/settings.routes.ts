import { Routes } from '@angular/router';
import { ComingSoon } from '../shared/coming-soon';

// Harcama parçası (hesaplar, kategoriler) bu dosyayı kendi sayfalarıyla doldurur.
export const SETTINGS_ROUTES: Routes = [{ path: '', component: ComingSoon, data: { title: 'Ayarlar' } }];
