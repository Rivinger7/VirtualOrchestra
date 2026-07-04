import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-piano-page',
  imports: [],
  templateUrl: './piano-page.html',
  host: {
    class: 'block min-h-screen',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PianoPage {}
