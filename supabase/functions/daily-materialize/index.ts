/**
 * Matérialise quotidiennement : planning nettoyage + checklists + rollover annexes.
 * Auth : header x-cron-secret === CRON_SECRET (obligatoire).
 *
 * Déploiement :
 *   supabase functions deploy daily-materialize --no-verify-jwt
 * Secrets : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const JOURS = [
  'dimanche',
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
];

function todayYmdParis() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(
    new Date()
  );
}

function weekdayKey(ymd) {
  const d = new Date(`${ymd}T12:00:00`);
  return JOURS[d.getDay()];
}

function checklistItemKey(templateId, title) {
  const slug = String(title || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return `${templateId}:${slug || 'item'}`;
}

function templateAppliesOnDate(template, dateYmd) {
  if (template.active === false) return false;
  const recurrence = template.recurrence || 'daily';
  if (recurrence === 'daily') return true;
  if (recurrence === 'weekdays') {
    const jour = weekdayKey(dateYmd);
    const keys = template.weekday_keys || [];
    return keys.includes(jour);
  }
  return false;
}

function isUniqueViolation(error) {
  return (
    error?.code === '23505' ||
    /duplicate key|unique constraint/i.test(error?.message || '')
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) {
    return new Response(JSON.stringify({ error: 'CRON_SECRET missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Supabase env missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const today = todayYmdParis();
  const jour = weekdayKey(today);

  const { data: restaurants, error: restoErr } = await admin
    .from('restaurants')
    .select('id, name');
  if (restoErr) {
    return new Response(JSON.stringify({ error: restoErr.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let createdQuotidien = 0;
  let createdChecklist = 0;
  let rolledAnnexes = 0;

  for (const resto of restaurants || []) {
    // ── Annexes : reporter les non terminées antérieures à aujourd’hui ──
    const { data: staleAnnexes } = await admin
      .from('tasks')
      .select('*')
      .eq('restaurant_id', resto.id)
      .eq('task_type', 'annexe')
      .eq('completed', false)
      .lt('scheduled_for', today);

    for (const t of staleAnnexes || []) {
      const title = String(t.title || '')
        .replace(/\s*\(reportée\)\s*$/i, '')
        .trim();
      if (!title) continue;
      await admin.from('tasks').insert({
        restaurant_id: resto.id,
        title,
        category: t.category || 'nettoyage',
        priority: t.priority || 'moyenne',
        task_type: 'annexe',
        scheduled_for: today,
        assigned_to: t.assigned_to || null,
        status: 'todo',
        completed: false,
        created_by: t.created_by || 'Système',
      });
      await admin.from('tasks').delete().eq('id', t.id);
      rolledAnnexes += 1;
    }

    // ── Quotidien depuis planning_templates ──
    const { data: dayTpl } = await admin
      .from('planning_templates')
      .select('tasks')
      .eq('restaurant_id', resto.id)
      .eq('day_of_week', jour)
      .maybeSingle();

    const templates = Array.isArray(dayTpl?.tasks) ? dayTpl.tasks : [];
    if (templates.length > 0) {
      const { data: existingToday } = await admin
        .from('tasks')
        .select('title')
        .eq('restaurant_id', resto.id)
        .eq('scheduled_for', today);
      const existingTitles = new Set(
        (existingToday || []).map((t) => String(t.title || '').trim())
      );

      const toInsert = [
        ...new Set(
          templates
            .filter((t) => t?.title && String(t.title).trim())
            .map((t) => String(t.title).trim())
        ),
      ]
        .filter((title) => !existingTitles.has(title))
        .map((title) => {
          const item = templates.find(
            (t) => String(t.title || '').trim() === title
          );
          return {
            restaurant_id: resto.id,
            title,
            category: 'nettoyage',
            priority: item?.priority || 'moyenne',
            task_type: 'quotidien',
            scheduled_for: today,
            status: 'todo',
            completed: false,
            created_by: 'Système',
          };
        });

      if (toInsert.length > 0) {
        const { error } = await admin.from('tasks').insert(toInsert);
        if (!error) createdQuotidien += toInsert.length;
        else if (!isUniqueViolation(error)) {
          console.error('quotidien insert', resto.id, error.message);
        }
      }
    }

    // ── Checklists (si table présente) ──
    const { data: checklists, error: clErr } = await admin
      .from('checklist_templates')
      .select('id, items, recurrence, weekday_keys, active, post')
      .eq('restaurant_id', resto.id);

    if (!clErr && checklists?.length) {
      const { data: existingCl } = await admin
        .from('tasks')
        .select('checklist_item_key')
        .eq('restaurant_id', resto.id)
        .eq('scheduled_for', today)
        .not('checklist_item_key', 'is', null);
      const existingKeys = new Set(
        (existingCl || []).map((t) => t.checklist_item_key).filter(Boolean)
      );

      const clInsert = [];
      for (const tpl of checklists) {
        if (!templateAppliesOnDate(tpl, today)) continue;
        const items = Array.isArray(tpl.items) ? tpl.items : [];
        for (const item of items) {
          const title = String(item?.title || '').trim();
          if (!title) continue;
          const key = checklistItemKey(tpl.id, title);
          if (existingKeys.has(key)) continue;
          existingKeys.add(key);
          clInsert.push({
            restaurant_id: resto.id,
            title,
            category: tpl.post === 'cuisine' ? 'cuisine' : 'nettoyage',
            priority: item.priority || 'moyenne',
            task_type: 'quotidien',
            scheduled_for: today,
            post: tpl.post === 'all' ? null : tpl.post,
            checklist_id: tpl.id,
            checklist_item_key: key,
            status: 'todo',
            completed: false,
            created_by: 'Système',
          });
        }
      }
      if (clInsert.length > 0) {
        const { error } = await admin.from('tasks').insert(clInsert);
        if (!error) createdChecklist += clInsert.length;
        else if (!isUniqueViolation(error)) {
          console.error('checklist insert', resto.id, error.message);
        }
      }
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      date: today,
      restaurants: (restaurants || []).length,
      createdQuotidien,
      createdChecklist,
      rolledAnnexes,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
