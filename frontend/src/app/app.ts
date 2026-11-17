import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './shared/theme';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: '<router-outlet />',
})
export class App {
  // Açılışta oluşur: Sistem modunda cihazın açık/koyu değişimini dinler.
  private readonly theme = inject(ThemeService);
}
