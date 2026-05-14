/**
 * Indique si le restaurant a déjà au moins une ligne dans `planning_templates`.
 * (Ne pas se baser sur `siteName` : il vient toujours du nom en base après correction du slug/embed.)
 */
export function hasPersistedPlanningTemplates(templateRows) {
  return Array.isArray(templateRows) && templateRows.length > 0;
}

/** Champs attendus par `savePlanningConfig` (évite d’envoyer des métadonnées UI). */
export function toPersistablePlanningConfig(config) {
  if (!config) return { siteName: '', planning: {}, annexes: [] };
  return {
    siteName: config.siteName ?? '',
    planning: config.planning ?? {},
    annexes: config.annexes ?? [],
  };
}
