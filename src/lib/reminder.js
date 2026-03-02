/**
 * Détermine si le rappel fin de journée doit s'afficher.
 * @param {number} hour - Heure actuelle (0-23)
 * @param {number} pendingCount - Nombre de tâches non réalisées
 * @param {boolean} dismissed - Utilisateur a fermé le rappel
 * @param {boolean} loading - Données en cours de chargement
 * @returns {boolean}
 */
export function shouldShowEndOfDayReminder(hour, pendingCount, dismissed, loading) {
  if (hour < 18 || dismissed || loading) return false;
  return pendingCount > 0;
}
