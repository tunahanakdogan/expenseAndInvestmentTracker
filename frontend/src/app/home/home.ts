import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-home',
  imports: [MatButtonModule, MatIconModule, MatToolbarModule],
  template: `
    <mat-toolbar>
      <span class="title">Finans Takip</span>
      <button matIconButton (click)="auth.logout()" aria-label="Çıkış yap">
        <mat-icon fontSet="material-symbols-outlined">logout</mat-icon>
      </button>
    </mat-toolbar>
    <main>
      @if (me(); as user) {
        <h1>Merhaba, {{ user.username }}</h1>
      }
      <p>Harcama ve yatırım ekranları yakında burada.</p>
    </main>
  `,
  styles: `
    .title {
      flex: 1;
    }
    main {
      padding: 16px;
    }
  `,
})
export class Home {
  protected readonly auth = inject(AuthService);
  protected readonly me = toSignal(this.auth.me());
}
