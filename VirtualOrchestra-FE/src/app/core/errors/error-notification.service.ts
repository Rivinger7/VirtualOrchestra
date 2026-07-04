import { Injectable, signal } from '@angular/core';

import { AppError } from './app-error.model';

@Injectable({
  providedIn: 'root',
})
export class ErrorNotificationService {
  private readonly activeErrors = signal<AppError[]>([]);

  readonly errors = this.activeErrors.asReadonly();

  report(error: AppError) {
    this.activeErrors.update((currentErrors) => {
      const duplicate = currentErrors.find(
        (currentError) =>
          currentError.source === error.source &&
          currentError.message === error.message &&
          currentError.details === error.details,
      );

      if (duplicate) {
        return currentErrors.map((currentError) =>
          currentError.id === duplicate.id ? { ...error, id: duplicate.id } : currentError,
        );
      }

      return [...currentErrors, error].slice(-3);
    });
  }

  dismiss(errorId: string) {
    this.activeErrors.update((currentErrors) =>
      currentErrors.filter((currentError) => currentError.id !== errorId),
    );
  }

  clear() {
    this.activeErrors.set([]);
  }
}