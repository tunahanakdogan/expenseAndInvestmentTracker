import { Component } from '@angular/core';
import { Accounts } from './accounts';
import { Categories } from './categories';

@Component({
  selector: 'app-settings',
  imports: [Accounts, Categories],
  template: `
    <section>
      <h2>Hesaplar</h2>
      <app-accounts />
    </section>
    <section>
      <h2>Kategoriler</h2>
      <app-categories />
    </section>
  `,
  styles: `
    :host {
      display: block;
      max-width: 560px;
    }
    section {
      margin-bottom: 32px;
    }
    h2 {
      font: var(--mat-sys-title-medium);
      margin: 0 0 8px;
    }
  `,
})
export class Settings {}
