-- Planning nettoyage PITAYA BÉTHUNE (quotidien par jour)
-- Restaurant : Pitaya Béthune (id fixe en prod dailydo-saas)

INSERT INTO public.planning_templates (restaurant_id, day_of_week, tasks)
VALUES
  ('b4131e33-14c9-4fff-a46a-ef1a9ac363ef', 'lundi', '[
    {"title": "Bouger toutes les tables et nettoyer en dessous.", "priority": "moyenne"},
    {"title": "Nettoyer toutes les étagères du labo et changer les lavettes.", "priority": "moyenne"},
    {"title": "Nettoyer les grilles en bas des saladettes et les joints des saladettes.", "priority": "moyenne"},
    {"title": "Nettoyer la porte du labo.", "priority": "moyenne"},
    {"title": "Détartrer le bain-marie et les passoires au vinaigre.", "priority": "moyenne"}
  ]'::jsonb),
  ('b4131e33-14c9-4fff-a46a-ef1a9ac363ef', 'mardi', '[
    {"title": "Nettoyer les crédences du labo.", "priority": "moyenne"},
    {"title": "Nettoyer l''intérieur de la poubelle du labo.", "priority": "moyenne"},
    {"title": "Nettoyer l''intérieur du frigo à boissons.", "priority": "moyenne"},
    {"title": "Nettoyer l''intérieur de la poubelle alimentaire.", "priority": "moyenne"},
    {"title": "Nettoyer le sol, la VMC et les étagères de la réserve.", "priority": "moyenne"}
  ]'::jsonb),
  ('b4131e33-14c9-4fff-a46a-ef1a9ac363ef', 'mercredi', '[
    {"title": "Bouger toutes les tables et nettoyer en dessous.", "priority": "moyenne"},
    {"title": "Bouger les frigos du labo et nettoyer derrière.", "priority": "moyenne"},
    {"title": "Nettoyer les distributeurs de produits de plonge.", "priority": "moyenne"},
    {"title": "Nettoyer l''intérieur de la saladette toppings et de la saladette sauces.", "priority": "moyenne"},
    {"title": "Nettoyer les crédences de la plonge.", "priority": "moyenne"}
  ]'::jsonb),
  ('b4131e33-14c9-4fff-a46a-ef1a9ac363ef', 'jeudi', '[
    {"title": "Nettoyer sous l''escalier.", "priority": "moyenne"},
    {"title": "Nettoyer les étagères à bols et celles de la plonge.", "priority": "moyenne"},
    {"title": "Nettoyer sous les woks.", "priority": "moyenne"},
    {"title": "Nettoyer l''extérieur de la hotte.", "priority": "moyenne"},
    {"title": "Faire les poussières.", "priority": "moyenne"}
  ]'::jsonb),
  ('b4131e33-14c9-4fff-a46a-ef1a9ac363ef', 'vendredi', '[
    {"title": "Bouger toutes les tables et nettoyer en dessous.", "priority": "moyenne"},
    {"title": "Nettoyer le vestiaire : sol, murs, VMC et poubelle.", "priority": "moyenne"},
    {"title": "Nettoyer le local poubelle.", "priority": "moyenne"},
    {"title": "Bouger le meuble des toilettes et nettoyer derrière.", "priority": "moyenne"}
  ]'::jsonb),
  ('b4131e33-14c9-4fff-a46a-ef1a9ac363ef', 'samedi', '[]'::jsonb),
  ('b4131e33-14c9-4fff-a46a-ef1a9ac363ef', 'dimanche', '[
    {"title": "Nettoyer l''intérieur des frigos du labo et leurs vitres.", "priority": "moyenne"},
    {"title": "Nettoyer derrière le frigo à boissons et sous le maintien au chaud.", "priority": "moyenne"},
    {"title": "Nettoyer l''espace balais de la plonge.", "priority": "moyenne"},
    {"title": "Nettoyer le piano : tours de boutons, plaques latérales et dessous.", "priority": "moyenne"}
  ]'::jsonb),
  ('b4131e33-14c9-4fff-a46a-ef1a9ac363ef', 'annexes', '[]'::jsonb)
ON CONFLICT (restaurant_id, day_of_week)
DO UPDATE SET tasks = EXCLUDED.tasks, updated_at = timezone('utc'::text, now());
