import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { ErrorNotificationService } from './error-notification.service';
import { normalizeError } from './error.utils';

export const httpErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const errorNotificationService = inject(ErrorNotificationService);

  return next(request).pipe(
    catchError((error) => {
      errorNotificationService.report(
        normalizeError(error, 'http', `${request.method} ${request.urlWithParams}`),
      );

      return throwError(() => error);
    }),
  );
};
