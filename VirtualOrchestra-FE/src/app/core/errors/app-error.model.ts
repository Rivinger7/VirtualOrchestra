export type AppErrorSource = 'http' | 'runtime';

export interface AppError {
  id: string;
  source: AppErrorSource;
  title: string;
  message: string;
  retryable: boolean;
  timestamp: string;
  status?: number;
  details?: string;
}