import { type Observable, of } from 'rxjs';

export function handleError(error: unknown, context: string): Observable<never> {
  console.error(`Erreur dans ${context}:`, error);
  // Vous pouvez ajouter ici une logique pour enregistrer l'erreur ou notifier l'utilisateur
  return of(); // Retourne un Observable vide pour continuer le flux
}
