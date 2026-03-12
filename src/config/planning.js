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

// ——— PITAYA EURALILLE : Chaque jour = quotidien (même liste tous les jours) ———
const QUOTIDIEN_EURALILLE = [
  { title: 'Salle / Terrasse : Poubelle', priority: 'moyenne' },
  { title: 'Salle / Terrasse : Sol (chaque soir)', priority: 'moyenne' },
  { title: 'Toilettes : Mur', priority: 'moyenne' },
  { title: 'Toilettes : Miroir', priority: 'moyenne' },
  { title: 'Toilettes : Cuvette', priority: 'moyenne' },
  { title: 'Toilettes : Lavabo', priority: 'moyenne' },
  { title: 'Toilettes : Sol', priority: 'moyenne' },
  { title: 'Toilettes : Stock (Sopalin, savon mains, matériel hygiénique)', priority: 'moyenne' },
  { title: 'Toilettes : Poubelles', priority: 'moyenne' },
  { title: 'Réserves : Sol', priority: 'moyenne' },
  { title: 'Vestiaire : Sol', priority: 'moyenne' },
  { title: 'Vestiaire : Porte', priority: 'moyenne' },
  { title: 'Couloir de livraison : Sol', priority: 'moyenne' },
  { title: 'Couloir de livraison : Balais (bleu, jaune, rouge)', priority: 'moyenne' },
  { title: 'Plonge : Inox plonge', priority: 'moyenne' },
  { title: 'Plonge : Sol', priority: 'moyenne' },
  { title: 'Plonge : Stock (Sopalin, savon mains)', priority: 'moyenne' },
  { title: 'Plonge : Ramassage des ordures', priority: 'moyenne' },
  { title: 'Plonge : Poubelles (intérieur / extérieur)', priority: 'moyenne' },
  { title: 'Plonge : Lave-vaisselle intérieur', priority: 'moyenne' },
  { title: 'Laboratoire : Stock produits alimentaires', priority: 'moyenne' },
  { title: 'Laboratoire : Inox labo', priority: 'moyenne' },
  { title: 'Laboratoire : Tablette pack', priority: 'moyenne' },
  { title: 'Laboratoire : Poubelle (intérieur / extérieur)', priority: 'moyenne' },
  { title: 'Caisse : Poubelle', priority: 'moyenne' },
  { title: 'Caisse : Sol', priority: 'moyenne' },
  { title: 'Caisse : Ordinateur', priority: 'moyenne' },
  { title: 'Caisse : Machine à café', priority: 'moyenne' },
  { title: 'Caisse : Rideau battant', priority: 'moyenne' },
  { title: 'Cuisine : Saladettes (intérieur / extérieur)', priority: 'moyenne' },
  { title: 'Cuisine : Sol', priority: 'moyenne' },
  { title: 'Cuisine : Stock (Sopalin et savon mains)', priority: 'moyenne' },
  { title: 'Cuisine : Lavabo', priority: 'moyenne' },
  { title: 'Cuisine : Four', priority: 'moyenne' },
  { title: 'Cuisine : Piano (dessus et dessous)', priority: 'moyenne' },
  { title: 'Cuisine : Vitre', priority: 'moyenne' },
  { title: 'Cuisine : Réchaud protéines', priority: 'moyenne' },
];

// ——— PITAYA EURALILLE : Chaque semaine = annexes ———
export const PLANNING_SEMAINE_EURALILLE = [
  { title: 'Toilettes : Porte', priority: 'moyenne' },
  { title: 'Réserves : Meubles', priority: 'moyenne' },
  { title: 'Réserves : Produits', priority: 'moyenne' },
  { title: 'Réserves : Portes', priority: 'moyenne' },
  { title: 'Vestiaire : Dessus des armoires', priority: 'moyenne' },
  { title: 'Bureau : Porte', priority: 'moyenne' },
  { title: 'Couloir de livraison : Mur', priority: 'moyenne' },
  { title: 'Couloir de livraison : Support à balais', priority: 'moyenne' },
  { title: 'Plonge : Lave-vaisselle', priority: 'moyenne' },
  { title: 'Plonge : Hotte', priority: 'moyenne' },
  { title: 'Plonge : Mur', priority: 'moyenne' },
  { title: 'Plonge : Porte', priority: 'moyenne' },
  { title: 'Plonge : Meuble plonge', priority: 'moyenne' },
  { title: 'Chambre froide négative : Sol', priority: 'moyenne' },
  { title: 'Chambre froide négative : Meubles', priority: 'moyenne' },
  { title: 'Chambre froide négative : Porte', priority: 'moyenne' },
  { title: 'Chambre froide positive : Sol', priority: 'moyenne' },
  { title: 'Chambre froide positive : Meubles', priority: 'moyenne' },
  { title: 'Chambre froide positive : Mur', priority: 'moyenne' },
  { title: 'Chambre froide positive : Porte', priority: 'moyenne' },
  { title: 'Laboratoire : Arrière', priority: 'moyenne' },
  { title: 'Caisse : Mur', priority: 'moyenne' },
  { title: 'Caisse : Table et dessous de table', priority: 'moyenne' },
  { title: 'Caisse : Extincteur', priority: 'moyenne' },
  { title: 'Cuisine : Frigo boissons', priority: 'moyenne' },
  { title: 'Cuisine : Saladettes arrière', priority: 'moyenne' },
  { title: 'Cuisine : Étagère bols', priority: 'moyenne' },
  { title: 'Cuisine : Étagère sacs à emporter', priority: 'moyenne' },
  { title: 'Cuisine : Mur', priority: 'moyenne' },
  { title: 'Cuisine : Frigo starters', priority: 'moyenne' },
  { title: 'Cuisine : Piano arrière', priority: 'moyenne' },
  { title: 'Cuisine : Hotte', priority: 'moyenne' },
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
