/** Postes / zones opérationnelles (checklists & filtres). */
export const OPS_POSTS = [
  { id: 'all', label: 'Tout le restaurant' },
  { id: 'cuisine', label: 'Cuisine' },
  { id: 'salle', label: 'Salle' },
  { id: 'bar', label: 'Bar' },
  { id: 'stock', label: 'Stock' },
];

export const TASK_STATUS_TODO = 'todo';
export const TASK_STATUS_IN_PROGRESS = 'in_progress';
export const TASK_STATUS_DONE = 'done';

export const TASK_STATUS_LABELS = {
  [TASK_STATUS_TODO]: 'À faire',
  [TASK_STATUS_IN_PROGRESS]: 'En cours',
  [TASK_STATUS_DONE]: 'Terminée',
};

export const CHECKLIST_RECURRENCE_DAILY = 'daily';
export const CHECKLIST_RECURRENCE_WEEKDAYS = 'weekdays';

/** Filtre liste principale : checklists vs planning nettoyage. */
export const TASK_LIST_ALL = 'all';
export const TASK_LIST_CHECKLIST = 'checklist';
export const TASK_LIST_NETTOYAGE = 'nettoyage';

export const TASK_LIST_FILTER_OPTIONS = [
  { id: TASK_LIST_ALL, label: 'Tout' },
  { id: TASK_LIST_CHECKLIST, label: 'Checklists' },
  { id: TASK_LIST_NETTOYAGE, label: 'Nettoyage' },
];

/**
 * Modèles Pitaya — points critiques à valider par le manager
 * (alignés sur taskmanagerpitaya / checklist manager ouverture, après-rush, fermeture).
 */
export const DEFAULT_CHECKLIST_TEMPLATES = [
  {
    name: 'Manager — Ouverture',
    post: 'all',
    recurrence: CHECKLIST_RECURRENCE_DAILY,
    weekdayKeys: null,
    sortOrder: 0,
    items: [
      // Démarrage
      { title: 'Frigos : allumer lumière, vérifier fonctionnement + relevé températures EPACK', priority: 'haute' },
      { title: 'Allumer les lumières (salle + BOH selon consigne)', priority: 'moyenne' },
      { title: 'Mettre la musique (volume / playlist charte)', priority: 'basse' },
      { title: 'Machine à café : allumer, préchauffage, MEP capsules si besoin', priority: 'moyenne' },
      { title: 'Climatisation : allumer si nécessaire', priority: 'basse' },
      // Contrôle de la veille
      { title: 'Contrôler fermeture de la veille (propreté, rotations, aucun décodé)', priority: 'haute' },
      { title: 'Vérifier DLC gastros – quantifier, jeter et saisir éventuelles pertes', priority: 'haute' },
      { title: 'Contrôler checklist caisse + salle ✅', priority: 'haute' },
      { title: 'Contrôler checklist cuisine ✅', priority: 'haute' },
      // Organisation
      { title: 'Liste des préparations selon CA prévisionnel, stock restant et DLC', priority: 'haute' },
      { title: 'Liste des décongélations de protéines selon CA prévisionnel, stock et DLC', priority: 'haute' },
      { title: 'Décongélation verrines : selon CA prévisionnel, stock restant et DLC', priority: 'haute' },
      // Ouverture opérationnelle
      { title: 'Contrôler rangement et propreté locaux (vestiaires, réserves, chambres froides, labo, toilettes, poubelles)', priority: 'haute' },
      { title: 'Mettre à jour ruptures sur les tablettes agrégateurs', priority: 'haute' },
      { title: 'Installer, compter la caisse et enregistrer fond de caisse', priority: 'haute' },
      { title: 'Livraison : pointer, contrôler rangement FIFO, « Réception marchandise » EPACK', priority: 'haute' },
      { title: 'Briefing équipe : plan de rush (postes), ruptures, objectifs de vente', priority: 'haute' },
      { title: 'Contrôler tenue EP et constater retards / absences', priority: 'moyenne' },
    ],
  },
  {
    name: 'Manager — Après-rush',
    post: 'all',
    recurrence: CHECKLIST_RECURRENCE_DAILY,
    weekdayKeys: null,
    sortOrder: 1,
    items: [
      { title: 'Vérifier DLC gastros et rotations', priority: 'haute' },
      { title: 'Quantifier, jeter et saisir éventuelles pertes', priority: 'haute' },
      { title: 'Décongélation verrines selon CA prévisionnel, stock restant et DLC', priority: 'haute' },
      { title: 'Frigos : vérifier fonctionnement + relevé températures EPACK', priority: 'haute' },
      { title: 'Saisir les bons repas', priority: 'haute' },
      { title: 'Pré-clôturer la caisse', priority: 'haute' },
      { title: 'Contrôler checklist caisse + salle ✅', priority: 'haute' },
      { title: 'Contrôler checklist cuisine ✅', priority: 'haute' },
      { title: 'Contrôler rangement et propreté locaux (vestiaires, réserves, chambres froides, labo, toilettes, poubelles)', priority: 'haute' },
      { title: 'Liste des décongélations de protéines pour la suite (CA / stock / DLC)', priority: 'haute' },
      { title: 'Liste des préparations pour la suite (CA / stock / DLC)', priority: 'haute' },
    ],
  },
  {
    name: 'Manager — Fermeture',
    post: 'all',
    recurrence: CHECKLIST_RECURRENCE_DAILY,
    weekdayKeys: null,
    sortOrder: 2,
    items: [
      { title: 'Vérifier DLC gastros et rotations', priority: 'haute' },
      { title: 'Quantifier, jeter et saisir éventuelles pertes', priority: 'haute' },
      { title: 'Décongélation verrines pour le lendemain (CA / stock / DLC)', priority: 'haute' },
      { title: 'Frigos : fonctionnement + relevé EPACK, éteindre lumière', priority: 'haute' },
      { title: 'Saisir les bons repas', priority: 'haute' },
      { title: 'Clôturer la caisse et ranger le tiroir caisse dans le bureau', priority: 'haute' },
      { title: 'Contrôler checklist caisse + salle ✅', priority: 'haute' },
      { title: 'Contrôler checklist cuisine ✅', priority: 'haute' },
      { title: 'Contrôler rangement et propreté locaux (vestiaires, réserves, chambres froides, labo, toilettes, poubelles)', priority: 'haute' },
      { title: 'DLC KO mises de côté pour le manager', priority: 'haute' },
      { title: 'Éteindre la musique', priority: 'moyenne' },
      { title: 'Éteindre la climatisation', priority: 'moyenne' },
      { title: 'Éteindre la machine à café', priority: 'moyenne' },
      { title: 'Verrouiller le bureau', priority: 'haute' },
      { title: 'Éteindre toutes les lumières', priority: 'haute' },
      { title: 'Verrouiller toutes les portes entrée / sortie', priority: 'haute' },
      { title: 'Enclencher l’alarme', priority: 'haute' },
    ],
  },
  {
    name: 'Cuisine — Ouverture',
    post: 'cuisine',
    recurrence: CHECKLIST_RECURRENCE_DAILY,
    weekdayKeys: null,
    sortOrder: 3,
    items: [
      { title: 'Ranger la livraison (FIFO)', priority: 'haute' },
      { title: 'Nettoyer le labo : sol, plans de travail, murs', priority: 'haute' },
      { title: 'Cuisson du riz', priority: 'haute' },
      { title: 'Féculents : udon, pad thaï, vermicelles bo bun + avance', priority: 'haute' },
      { title: 'Sauces gastro / bouteilles : MEP + rotations', priority: 'haute' },
      { title: 'Piment gastro + huile (emplacements habituels)', priority: 'moyenne' },
      { title: 'Bain-marie : ne pas lancer avant 10h30 si consigne locale', priority: 'moyenne' },
      { title: 'Lave-vaisselle : MEP (sel, produit, rinçage), lancement si pile', priority: 'moyenne' },
      { title: 'Plonge : couvercles, crépines, zone propre avant rush', priority: 'moyenne' },
      { title: 'Préparation / liste manager : appliquer les priorités du jour', priority: 'haute' },
      { title: 'Décongélation : produits indiqués (DLC / FIFO)', priority: 'haute' },
      { title: 'Vitres cuisine côté salle propres', priority: 'moyenne' },
      { title: 'Poubelles veille sorties, nouveaux sacs posés', priority: 'moyenne' },
      { title: 'MEP ustensiles : pinces wok, louches wok / sauces, pinces saladette', priority: 'moyenne' },
      { title: 'MEP ustensiles : ciseaux piment / herbes, cuillères topping', priority: 'moyenne' },
    ],
  },
  {
    name: 'Caisse & Salle — Ouverture',
    post: 'salle',
    recurrence: CHECKLIST_RECURRENCE_DAILY,
    weekdayKeys: null,
    sortOrder: 4,
    items: [
      { title: 'Serviettes, baguettes, fourchettes, cuillères, pailles, gobelets, sacs', priority: 'haute' },
      { title: 'Bols et couvercles (petits et grands)', priority: 'haute' },
      { title: 'Sel, poivre, sauces 15ml, chips de crevette', priority: 'moyenne' },
      { title: 'Vitrines : boissons, compotes, glaces, macarons', priority: 'moyenne' },
      { title: 'Cookies (attention rotation)', priority: 'moyenne' },
      { title: 'Remplir épicerie', priority: 'basse' },
      { title: 'Agrafeuses, marqueur, rouleaux CB et caisse', priority: 'moyenne' },
      { title: 'Carafes d’eau au frais', priority: 'moyenne' },
      { title: 'Essuie-mains + savon lave(s) mains', priority: 'haute' },
      { title: 'Gel hydroalcoolique clients', priority: 'moyenne' },
      { title: 'Machine à café (salle) : bacs / tiroirs / capsules / surfaces', priority: 'moyenne' },
      { title: 'Gobelets boissons chaudes, touillettes, sucre', priority: 'basse' },
      { title: 'Boîtes / sachets macarons + vignettes à jour', priority: 'basse' },
      { title: 'Nettoyer espace caisse : écran, comptoir, TPE, imprimantes, tablettes', priority: 'haute' },
      { title: 'Balayer et laver le sol de la salle', priority: 'haute' },
      { title: 'Toilettes : sol, inox, miroir, savon & papier si besoin', priority: 'haute' },
    ],
  },
  {
    name: 'Cuisine — Après-rush',
    post: 'cuisine',
    recurrence: CHECKLIST_RECURRENCE_DAILY,
    weekdayKeys: null,
    sortOrder: 5,
    items: [
      { title: 'Mettre en plonge les ustensiles (pinces, ciseaux, louches, cuillères)', priority: 'haute' },
      { title: 'Nettoyer vitres cuisine (raclette)', priority: 'moyenne' },
      { title: 'Nettoyer toutes les surfaces inox', priority: 'haute' },
      { title: 'Nettoyer cuiseurs à riz', priority: 'haute' },
      { title: 'Nettoyer frigos (porte, poignée, joints)', priority: 'haute' },
      { title: 'Nettoyer sol : balayer, brosser, racler', priority: 'haute' },
      { title: 'Vider poubelles', priority: 'moyenne' },
    ],
  },
  {
    name: 'Fermeture — Cuisine & Salle',
    post: 'all',
    recurrence: CHECKLIST_RECURRENCE_DAILY,
    weekdayKeys: null,
    sortOrder: 6,
    items: [
      { title: 'Éteindre les hottes', priority: 'haute' },
      { title: 'Nettoyer les hottes + grilles', priority: 'haute' },
      { title: 'Vider et nettoyer le bain-marie', priority: 'haute' },
      { title: 'Plonge tout inox + nettoyer espace plonge', priority: 'haute' },
      { title: 'Vidanger et éteindre le lave-vaisselle', priority: 'haute' },
      { title: 'Nettoyer surfaces inox, cuiseurs à riz, frigos', priority: 'haute' },
      { title: 'Nettoyer sol cuisine + labo + plonge', priority: 'haute' },
      { title: 'Couvrir gastros saladette + topping avec couvercles adaptés', priority: 'haute' },
      { title: 'Ranger gastros / bouteilles DLC OK', priority: 'haute' },
      { title: 'Mettre de côté les DLC KO (pour le manager)', priority: 'haute' },
      { title: 'Vider poubelles + sortir poubelle selon jour de collecte', priority: 'haute' },
      { title: 'Nettoyer tabourets et tables, monter tabourets', priority: 'moyenne' },
      { title: 'Rentrer terrasse + totem + stop trottoir + cendrier', priority: 'haute' },
      { title: 'Propreté toilettes clients', priority: 'haute' },
    ],
  },
];

/** Noms des modèles Pitaya (pour import sans doublon). */
export const PITAYA_CHECKLIST_TEMPLATE_NAMES = DEFAULT_CHECKLIST_TEMPLATES.map((t) => t.name);
