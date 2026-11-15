import { Component, input } from '@angular/core';

/** Özelliği henüz yazılmamış bölümler için geçici sayfa; parçalar kendi sayfalarıyla değiştirir. */
@Component({
  selector: 'app-coming-soon',
  template: `
    <h1>{{ title() }}</h1>
    <p>Bu bölüm yakında burada.</p>
  `,
})
export class ComingSoon {
  readonly title = input.required<string>();
}
