import type { Observable } from 'rxjs';
import { throwError, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

export interface ErrorWithContext extends Error {
  context?: string;
}

export function logError(error: ErrorWithContext): void {
  console.error(`Erreur dans ${error.context || 'contexte inconnu'}:`, error.message);
  // Ici, vous pourriez ajouter une logique pour envoyer l'erreur à un service de monitoring
}

export function handleError(error: unknown, context: string): Observable<never> {
  const errorWithContext: ErrorWithContext =
    error instanceof Error ? error : new Error(String(error));
  errorWithContext.context = context;
  logError(errorWithContext);
  return throwError(() => errorWithContext);
}

export function retryStrategy({
  maxRetryAttempts = 3,
  scalingDuration = 1000,
  excludedStatusCodes = [],
}: {
  maxRetryAttempts?: number;
  scalingDuration?: number;
  excludedStatusCodes?: number[];
} = {}) {
  return (attempts: Observable<Error>) => {
    return attempts.pipe(
      mergeMap((error, i) => {
        const retryAttempt = i + 1;
        if (
          retryAttempt > maxRetryAttempts ||
          (error instanceof Error && excludedStatusCodes.find((e) => e === (error as Error & { status?: number }).status))
        ) {
          return throwError(() => error);
        }
        console.log(`Tentative ${retryAttempt}: nouvelle tentative dans ${scalingDuration * retryAttempt}ms`);
        return timer(scalingDuration * retryAttempt);
      })
    );
  };
}
