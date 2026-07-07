import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ErrorOutletComponent } from './core/errors/error-outlet/error-outlet';
import { PianoPage } from './features/instruments/piano/page/piano-page';
import { HeaderComponent } from './layout/header/header';
import { FooterComponent } from './layout/footer/footer';

@Component({
  selector: 'app-root',
  imports: [ErrorOutletComponent, RouterOutlet, PianoPage, HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    class: 'block',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title = signal('VirtualOrchestra-FE');
}
