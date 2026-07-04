import { ErrorHandler, Injectable, Injector } from '@angular/core';

import { ErrorNotificationService } from './error-notification.service';
import { normalizeError } from './error.utils';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private readonly injector: Injector) {}

  handleError(error: unknown): void {
    const actualError = unwrapUnhandledError(error);

    this.injector.get(ErrorNotificationService).report(normalizeError(actualError, 'runtime'));

    console.error('Unhandled application error', actualError);
  }
}

function unwrapUnhandledError(error: unknown) {
  if (typeof error === 'object' && error && 'rejection' in error) {
    return Reflect.get(error, 'rejection');
  }

  return error;
}