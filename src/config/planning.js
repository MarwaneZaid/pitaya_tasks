/**
 * Planning nettoyage PITAYA BÉTHUNE – tâches indispensables par jour
 * Matin / Après-midi à titre indicatif
 */
export const PLANNING_NETTOYAGE = {
  lundi: [
    { title: 'Bouger toutes les tables et nettoyer en dessous', priority: 'haute' },
    { title: 'Nettoyer toutes les étagères du labo et changer les lavettes', priority: 'moyenne' },
    { title: 'Nettoyer les grilles en bas des saladettes et joint saladette', priority: 'moyenne' },
    { title: 'Nettoyer la porte du labo', priority: 'moyenne' },
    { title: 'Détartrage du bain marie et des passoires au vinaigre', priority: 'moyenne' },
  ],
  mardi: [
    { title: 'Nettoyer les crédences du labo', priority: 'haute' },
    { title: "Nettoyer l'intérieur de la poubelle labo", priority: 'haute' },
    { title: 'Intérieur frigo boisson', priority: 'moyenne' },
    { title: "Nettoyer l'intérieur de la poubelle alimentaire", priority: 'moyenne' },
    { title: 'Nettoyer le sol, la VMC et les étagères de la réserve', priority: 'moyenne' },
  ],
  mercredi: [
    { title: 'Bouger toutes les tables et nettoyer en dessous', priority: 'haute' },
    { title: 'Bouger les frigo du labo et nettoyer à l\'arrière', priority: 'haute' },
    { title: 'Nettoyer les distributeurs des produits à plonge', priority: 'moyenne' },
    { title: 'Intérieur saladette topping et saladette sauce', priority: 'moyenne' },
    { title: 'Nettoyer les crédences de la plonge', priority: 'moyenne' },
  ],
  jeudi: [
    { title: 'Nettoyer sous l\'escalier', priority: 'haute' },
    { title: 'Nettoyer les étagères à bol et celle de la plonge', priority: 'moyenne' },
    { title: 'Nettoyer sous les woks', priority: 'moyenne' },
    { title: "Nettoyer l'extérieur de la hotte", priority: 'moyenne' },
    { title: 'Faire les poussières', priority: 'moyenne' },
  ],
  vendredi: [
    { title: 'Bouger toutes les tables et nettoyer en dessous', priority: 'haute' },
    { title: 'Nettoyer le vestiaire = sol, mur, VMC, poubelle', priority: 'haute' },
    { title: 'Nettoyer le local poubelle', priority: 'moyenne' },
    { title: 'Bouger le meuble des toilettes et nettoyer derrière', priority: 'moyenne' },
  ],
  samedi: [],
  dimanche: [
    { title: "Nettoyer l'intérieur des frigo du labo et leurs vitres", priority: 'moyenne' },
    { title: 'Nettoyer derrière le frigo boisson et sous le maintien au chaud', priority: 'moyenne' },
    { title: "Nettoyer l'espace balai de la plonge", priority: 'moyenne' },
    { title: 'Nettoyage du piano (tour de bouton, plaque latérales, et dessous)', priority: 'moyenne' },
  ],
};

export const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
