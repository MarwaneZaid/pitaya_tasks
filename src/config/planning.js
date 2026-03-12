/**
 * Planning nettoyage – BÉTHUNE ou EURALILLE selon VITE_PLANNING
 * BÉTHUNE : tâches par jour de la semaine (lundi, mardi, …)
 * EURALILLE : tâches "Chaque jour" = quotidien (même liste tous les jours), "Chaque semaine" = annexes
 */

const isEuralille = typeof import.meta.env.VITE_PLANNING === 'string' && import.meta.env.VITE_PLANNING.toLowerCase() === 'euralille';

// ——— PITAYA BÉTHUNE ———
export const PLANNING_BETHUNE = {
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

// ——— PITAYA EURALILLE : Chaque jour = quotidien (tâches regroupées par zone) ———
const QUOTIDIEN_EURALILLE = [
  { title: 'Salle / Terrasse : Poubelle et sol (chaque soir)', priority: 'moyenne' },
  { title: 'Toilettes : Mur, miroir, cuvette, lavabo, sol, stock (Sopalin, savon, matériel hygiénique), poubelles', priority: 'moyenne' },
  { title: 'Réserves : Sol', priority: 'moyenne' },
  { title: 'Vestiaire : Sol et porte', priority: 'moyenne' },
  { title: 'Couloir de livraison : Sol et balais (bleu, jaune, rouge)', priority: 'moyenne' },
  { title: 'Plonge : Inox, sol, stock (Sopalin, savon), ramassage ordures, poubelles (intérieur/extérieur), lave-vaisselle intérieur', priority: 'moyenne' },
  { title: 'Laboratoire : Stock produits alimentaires, inox labo, tablette pack, poubelle (intérieur/extérieur)', priority: 'moyenne' },
  { title: 'Caisse : Poubelle, sol, ordinateur, machine à café, rideau battant', priority: 'moyenne' },
  { title: 'Cuisine : Saladettes (intérieur/extérieur), sol, stock (Sopalin, savon), lavabo, four, piano (dessus et dessous), vitre, réchaud protéines', priority: 'moyenne' },
];

// ——— PITAYA EURALILLE : Chaque semaine = annexes (tâches regroupées par zone) ———
export const PLANNING_SEMAINE_EURALILLE = [
  { title: 'Toilettes : Porte', priority: 'moyenne' },
  { title: 'Réserves : Meubles, produits, portes', priority: 'moyenne' },
  { title: 'Vestiaire : Dessus des armoires', priority: 'moyenne' },
  { title: 'Bureau : Porte', priority: 'moyenne' },
  { title: 'Couloir de livraison : Mur et support à balais', priority: 'moyenne' },
  { title: 'Plonge : Lave-vaisselle, hotte, mur, porte, meuble plonge', priority: 'moyenne' },
  { title: 'Chambre froide négative : Sol, meubles, porte', priority: 'moyenne' },
  { title: 'Chambre froide positive : Sol, meubles, mur, porte', priority: 'moyenne' },
  { title: 'Laboratoire : Arrière', priority: 'moyenne' },
  { title: 'Caisse : Mur, table et dessous de table, extincteur', priority: 'moyenne' },
  { title: 'Cuisine : Frigo boissons, saladettes arrière, étagère bols, étagère sacs à emporter, mur, frigo starters, piano arrière, hotte', priority: 'moyenne' },
];

const PLANNING_EURALILLE = {
  lundi: QUOTIDIEN_EURALILLE,
  mardi: QUOTIDIEN_EURALILLE,
  mercredi: QUOTIDIEN_EURALILLE,
  jeudi: QUOTIDIEN_EURALILLE,
  vendredi: QUOTIDIEN_EURALILLE,
  samedi: QUOTIDIEN_EURALILLE,
  dimanche: QUOTIDIEN_EURALILLE,
};

/** Planning utilisé (selon VITE_PLANNING) */
export const PLANNING_NETTOYAGE = isEuralille ? PLANNING_EURALILLE : PLANNING_BETHUNE;

/** True si le site utilise le planning Euralille (tâches hebdo = annexes) */
export const IS_PLANNING_EURALILLE = isEuralille;

export const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
