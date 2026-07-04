import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ErrorNotificationService } from '../error-notification.service';

@Component({
  selector: 'app-error-outlet',
  imports: [],
  templateUrl: './error-outlet.html',
  styleUrl: './error-outlet.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorOutletComponent {
  private readonly errorNotificationService = inject(ErrorNotificationService);

  readonly errors = this.errorNotificationService.errors;

  dismiss(errorId: string) {
    this.errorNotificationService.dismiss(errorId);
  }
}