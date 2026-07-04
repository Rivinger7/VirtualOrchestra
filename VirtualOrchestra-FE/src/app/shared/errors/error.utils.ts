import { HttpErrorResponse } from '@angular/common/http';

import { AppError, AppErrorSource } from './app-error.model';

export function normalizeError(
  error: unknown,
  source: AppErrorSource = 'runtime',
  details?: string,
): AppError {
  if (error instanceof HttpErrorResponse) {
    return {
      id: createErrorId(),
      source: 'http',
      title: getHttpErrorTitle(error),
      message: getHttpErrorMessage(error),
      retryable: error.status === 0 || error.status >= 500,
      timestamp: new Date().toISOString(),
      status: error.status,
      details: details ?? buildHttpDetails(error),
    };
  }

  if (error instanceof Error) {
    return {
      id: createErrorId(),
      source,
      title: 'Unexpected application error',
      message: error.message || 'An unexpected error interrupted the current action.',
      retryable: false,
      timestamp: new Date().toISOString(),
      details,
    };
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return {
      id: createErrorId(),
      source,
      title: 'Unexpected application error',
      message: error,
      retryable: false,
      timestamp: new Date().toISOString(),
      details,
    };
  }

  return {
    id: createErrorId(),
    source,
    title: 'Unexpected application error',
    message: 'Something went wrong while processing your request.',
    retryable: false,
    timestamp: new Date().toISOString(),
    details,
  };
}

export function getErrorMessage(error: unknown) {
  return normalizeError(error).message;
}

function getHttpErrorTitle(error: HttpErrorResponse) {
  if (error.status === 0) {
    return 'Network unavailable';
  }

  if (error.status >= 500) {
    return 'Server error';
  }

  if (error.status === 404) {
    return 'Resource not found';
  }

  if (error.status === 401 || error.status === 403) {
    return 'Access denied';
  }

  if (error.status >= 400) {
    return 'Request failed';
  }

  return 'HTTP request failed';
}

function getHttpErrorMessage(error: HttpErrorResponse) {
  if (error.status === 0) {
    return 'The server is unreachable. Check the backend connection and try again.';
  }

  const payloadMessage = extractPayloadMessage(error.error);
  if (payloadMessage) {
    return payloadMessage;
  }

  if (error.message) {
    return error.message;
  }

  return 'The server returned an unexpected response.';
}

function extractPayloadMessage(payload: unknown): string | undefined {
  if (!payload) {
    return undefined;
  }

  if (typeof payload === 'string' && payload.trim().length > 0) {
    return payload;
  }

  if (typeof payload === 'object') {
    const maybeMessage = Reflect.get(payload, 'message');
    if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
      return maybeMessage;
    }

    const maybeError = Reflect.get(payload, 'error');
    if (typeof maybeError === 'string' && maybeError.trim().length > 0) {
      return maybeError;
    }
  }

  return undefined;
}

function buildHttpDetails(error: HttpErrorResponse) {
  const requestUrl = error.url ?? 'Unknown endpoint';
  const statusLabel = error.status > 0 ? `HTTP ${error.status}` : 'No response';

  return `${statusLabel} • ${requestUrl}`;
}

function createErrorId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
