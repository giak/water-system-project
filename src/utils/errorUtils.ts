import type { Observable } from 'rxjs';
import { of } from 'rxjs';

/**
 * Gère les erreurs survenant dans le système d'eau.
 *
 * @param {unknown} error - L'erreur à gérer
 * @param {string} context - Le contexte dans lequel l'erreur s'est produite
 * @returns {Observable<never>} Un Observable vide pour continuer le flux
 *
 * @description
 * Cette fonction est cruciale pour la robustesse du système. Elle centralise la gestion des erreurs,
 * permettant une approche cohérente et extensible pour traiter les problèmes.
 *
 * Fonctionnement :
 * 1. Log l'erreur dans la console avec le contexte pour faciliter le débogage.
 * 2. Pourrait être étendue pour envoyer l'erreur à un service de monitoring externe.
 * 3. Retourne un Observable vide pour ne pas interrompre le flux de données.
 */
export function handleError(error: unknown, context: string): Observable<never> {
  console.error(`Erreur dans ${context}:`, error);
  // TODO : Vous pouvez ajouter ici une logique pour envoyer l'erreur à un service de monitoring
  return of(); // Retourne un Observable vide pour continuer le flux
}
