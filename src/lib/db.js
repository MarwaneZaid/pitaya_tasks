import { supabase, getSupabase } from './storage-supabase';
import { isAuthAbortedError, sleepMs } from './authPrefs';
import { mergeTasksWithUpsertRows } from './saveTasksMerge';
import { normalizeTaskFields } from './taskStatus';
import { mapTaskRows } from './taskRowMap';
import {
  buildTasksFromChecklists,
  mapChecklistRow,
} from './checklists';
import { DASHBOARD_TASK_LOOKBACK_DAYS } from '../config/constants';
import { daysAgoYmd } from './taskUtils';

function getClient() {
  return getSupabase() || supabase;
}

/** Valide la session (getUser serveur si possible ; sinon JWT local — évite abort mobile). */
async function assertAuthUserSynced(client) {
  const { data: { session } } = await client.auth.getSession();
  if (!session?.user?.id) {
    throw new Error('Session invalide ou expirée. Déconnectez-vous et reconnectez-vous.');
  }
  try {
    const { data: { user }, error } = await client.auth.getUser();
    if (!error && user?.id) return user;
  } catch (e) {
    if (!isAuthAbortedError(e)) throw e;
  }
  return session.user;
}

function rethrowMappedDbError(err) {
  const raw = err?.message || String(err);
  const normalized = String(raw).toLowerCase();

  if (
    normalized.includes('load failed') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed')
  ) {
    throw new Error(
      "Connexion au serveur impossible. Vérifiez Internet, l'URL Supabase et la clé anon, puis réessayez."
    );
  }
  if (raw.includes('user_roles_user_id_fkey')) {
    throw new Error(
      "Votre compte n'est pas reconnu par la base (session désynchronisée ou mauvais projet Supabase). Déconnectez-vous, videz les données du site pour ce domaine si besoin, puis reconnectez-vous."
    );
  }
  if (raw.includes('Utilisateur Auth introuvable')) {
    throw new Error(
      "Compte non trouvé côté serveur. Déconnectez-vous et reconnectez-vous : l'application doit utiliser le même projet Supabase que votre inscription."
    );
  }
  throw err instanceof Error ? err : new Error(raw);
}

let cachedRestaurant = null;
let cachedRestaurantAt = 0;
const RESTAURANT_CACHE_MS = 10000;
/** Évite deux requêtes `user_roles` en parallèle (ex. getPlanningConfig + getTasks). */
let inflightUserRestaurant = null;

/** Extrait le nom depuis la relation PostgREST `restaurants` (objet ou tableau selon versions / vues). */
function nameFromRestaurantsEmbed(restaurantsField) {
  if (!restaurantsField) return null;
  if (Array.isArray(restaurantsField)) {
    const first = restaurantsField[0];
    if (first?.name == null) return null;
    const t = String(first.name).trim();
    return t || null;
  }
  if (restaurantsField.name == null) return null;
  const t = String(restaurantsField.name).trim();
  return t || null;
}

async function fetchRestaurantNameById(client, restaurantId) {
  const { data: row, error } = await client
    .from('restaurants')
    .select('name')
    .eq('id', restaurantId)
    .maybeSingle();
  if (error || row?.name == null) return null;
  const t = String(row.name).trim();
  return t || null;
}

async function fetchRestaurantByUserId(client, userId) {
  let role = null;
  let error = null;

  ({ data: role, error } = await client
    .from('user_roles')
    .select('restaurant_id, role, display_name, restaurants(name, invite_code, invite_code_expires_at)')
    .eq('user_id', userId)
    .maybeSingle());

  // Migrations P0/P1 pas encore appliquées : colonnes absentes.
  if (error && /(invite_code|display_name)/i.test(error.message || '')) {
    ({ data: role, error } = await client
      .from('user_roles')
      .select('restaurant_id, role, restaurants(name)')
      .eq('user_id', userId)
      .maybeSingle());
  }

  if (error || !role) return null;

  let name = nameFromRestaurantsEmbed(role.restaurants);
  if (!name) {
    name = await fetchRestaurantNameById(client, role.restaurant_id);
  }

  const embed = Array.isArray(role.restaurants) ? role.restaurants[0] : role.restaurants;
  const restaurant = {
    id: role.restaurant_id,
    name: name || '',
    role: role.role,
    displayName: role.display_name || null,
    inviteCode: embed?.invite_code || null,
    inviteCodeExpiresAt: embed?.invite_code_expires_at || null,
  };
  cachedRestaurant = restaurant;
  cachedRestaurantAt = Date.now();
  return restaurant;
}

/** À appeler après déconnexion pour ne pas réutiliser le restaurant du compte précédent (latence / mauvais rôle). */
export function clearRestaurantCache() {
  cachedRestaurant = null;
  cachedRestaurantAt = 0;
  inflightUserRestaurant = null;
}

export async function getUserRestaurant() {
  const client = getClient();
  if (!client) return null;

  // Cache hit: évite getSession() (latence notable à chaque ouverture calendrier).
  if (
    cachedRestaurant &&
    Date.now() - cachedRestaurantAt < RESTAURANT_CACHE_MS
  ) {
    return cachedRestaurant;
  }

  const { data: { session } } = await client.auth.getSession();
  if (!session?.user?.id) return null;

  if (inflightUserRestaurant) return inflightUserRestaurant;

  const userId = session.user.id;
  inflightUserRestaurant = (async () => {
    let lastError;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        return await fetchRestaurantByUserId(client, userId);
      } catch (e) {
        lastError = e;
        if (!isAuthAbortedError(e) || attempt >= 3) throw e;
        await sleepMs(350 * (attempt + 1));
      }
    }
    throw lastError;
  })().finally(() => {
    inflightUserRestaurant = null;
  });

  return inflightUserRestaurant;
}

const RPC_TIMEOUT_MS = 12000;

export async function createRestaurant(name) {
  const client = getClient();
  if (!client) throw new Error("Supabase n'est pas configuré.");
  const { data: { session } } = await client.auth.getSession();
  if (!session) throw new Error("Non authentifié");
  const userId = session.user.id;

  const [, prior] = await Promise.all([
    assertAuthUserSynced(client),
    fetchRestaurantByUserId(client, userId),
  ]);

  // Si l’utilisateur est déjà lié en « employé » (ex. flux Équipe·code), la RPC Postgres
  // retourne le resto existant sans créer ni promouvoir → il reste employé. On bloque avec un message clair.
  if (prior) {
    if (prior.role === 'owner') {
      return { id: prior.id };
    }
    throw new Error(
      "Ce compte est déjà membre d’un restaurant en tant qu’employé. Vous ne pouvez pas créer un nouvel espace gérant avec ce compte. Utilisez l’onglet « Gérant · créer l’espace » avec un autre identifiant, ou demandez à votre gérant de vous promouvoir."
    );
  }

  const rpcPromise = client.rpc('create_restaurant', { p_name: name });
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            "Délai dépassé. Vérifiez votre connexion ou exécutez docs/supabase-dailydo-complete-fix.sql dans le SQL Editor Supabase."
          )
        ),
      RPC_TIMEOUT_MS
    )
  );
  try {
    const result = await Promise.race([rpcPromise, timeoutPromise]);
    const { data, error } = result;
    if (error) {
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        throw new Error(
          "Fonction Supabase manquante. Exécutez docs/supabase-dailydo-complete-fix.sql dans le SQL Editor Supabase."
        );
      }
      throw error;
    }
    clearRestaurantCache();
    return { id: data?.id };
  } catch (e) {
    rethrowMappedDbError(e);
  }
}

export async function getPlanningConfig() {
  const resto = await getUserRestaurant();
  if (!resto) return null;
  const client = getClient();
  if (!client) return null;

  const { data: templates } = await client
    .from('planning_templates')
    .select('day_of_week, tasks')
    .eq('restaurant_id', resto.id);

  const config = {
    siteName: resto.name,
    planning: {
      lundi: [], mardi: [], mercredi: [], jeudi: [], vendredi: [], samedi: [], dimanche: []
    },
    annexes: []
  };

  if (templates) {
    templates.forEach(t => {
      if (t.day_of_week === 'annexes') {
        config.annexes = t.tasks || [];
      } else if (config.planning[t.day_of_week]) {
        config.planning[t.day_of_week] = t.tasks || [];
      }
    });
  }

  const templateListLen = Array.isArray(templates) ? templates.length : 0;
  config.hasPersistedPlanning = templateListLen > 0;

  return config;
}

export async function savePlanningConfig(config) {
  const resto = await getUserRestaurant();
  if (!resto) throw new Error("Aucun restaurant trouvé");

  // On sauvegarde le nom du restaurant
  const client = getClient();
  if (!client) throw new Error("Supabase n'est pas configuré.");
  if (config.siteName && config.siteName !== resto.name) {
    await client.from('restaurants').update({ name: config.siteName }).eq('id', resto.id);
    cachedRestaurant = { ...resto, name: config.siteName };
    cachedRestaurantAt = Date.now();
  }

  const upserts = [];

  // Plannings journaliers
  for (const [day, tasks] of Object.entries(config.planning)) {
    upserts.push({
      restaurant_id: resto.id,
      day_of_week: day,
      tasks: tasks
    });
  }

  // Annexes
  upserts.push({
    restaurant_id: resto.id,
    day_of_week: 'annexes',
    tasks: config.annexes || []
  });

  const { error } = await client
    .from('planning_templates')
    .upsert(upserts, { onConflict: 'restaurant_id, day_of_week' });

  if (error) throw error;
}

// ── Checklists opérationnelles ───────────────────────────────────────────────

export async function getChecklistTemplates() {
  const resto = await getUserRestaurant();
  if (!resto) return [];
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from('checklist_templates')
    .select('*')
    .eq('restaurant_id', resto.id)
    .order('sort_order', { ascending: true });

  if (error) {
    if (error.message?.includes('checklist_templates')) {
      return [];
    }
    rethrowMappedDbError(error);
  }
  return (data || []).map(mapChecklistRow);
}

export async function saveChecklistTemplate(template) {
  const resto = await getUserRestaurant();
  if (!resto) throw new Error('Aucun restaurant trouvé');
  const client = getClient();
  if (!client) throw new Error("Supabase n'est pas configuré.");

  const row = {
    restaurant_id: resto.id,
    name: template.name,
    post: template.post || 'all',
    recurrence: template.recurrence || 'daily',
    weekday_keys: template.weekdayKeys || null,
    items: template.items || [],
    sort_order: template.sortOrder ?? 0,
    active: template.active !== false,
  };

  if (template.id) {
    const { data, error } = await client
      .from('checklist_templates')
      .update(row)
      .eq('id', template.id)
      .eq('restaurant_id', resto.id)
      .select()
      .single();
    if (error) throw error;
    return mapChecklistRow(data);
  }

  const { data, error } = await client
    .from('checklist_templates')
    .insert([row])
    .select()
    .single();
  if (error) throw error;
  return mapChecklistRow(data);
}

export async function deleteChecklistTemplate(templateId) {
  const client = getClient();
  if (!client || !templateId) return;
  const { error } = await client.from('checklist_templates').delete().eq('id', templateId);
  if (error) rethrowMappedDbError(error);
}

/** Génère les tâches checklist manquantes pour une date (idempotent). */
export async function materializeChecklistsForDate(dateYmd, createdBy) {
  const templates = await getChecklistTemplates();
  if (templates.length === 0) return [];
  const existing = await getTasks(dateYmd);
  const toCreate = buildTasksFromChecklists(templates, dateYmd, existing, createdBy);
  if (toCreate.length === 0) return [];
  return saveTasks(toCreate);
}

function taskToDbPayload(resto, task) {
  const norm = normalizeTaskFields(task);
  const deadline =
    task.deadline && String(task.deadline).trim()
      ? new Date(task.deadline).toISOString()
      : null;
  const payload = {
    restaurant_id: resto.id,
    title: task.title,
    category: task.category || 'nettoyage',
    priority: task.priority || 'moyenne',
    task_type: task.taskType || 'quotidien',
    scheduled_for: task.scheduledFor,
    assigned_to: task.assignedTo || null,
    deadline,
    status: norm.status,
    completed: norm.completed,
    created_by: task.createdBy,
    started_at: norm.startedAt,
    completed_at: norm.completedAt,
    completed_by: norm.completedBy,
    post: task.post || null,
    checklist_id: task.checklistId || null,
    checklist_item_key: task.checklistItemKey || null,
    proof_note: task.proofNote || null,
  };
  return payload;
}

export async function getTasks(dateFilter = null, options = {}) {
  const resto = await getUserRestaurant();
  if (!resto) return [];
  const client = getClient();
  if (!client) return [];

  const sinceDays =
    options.sinceDays === null || options.sinceDays === undefined
      ? DASHBOARD_TASK_LOOKBACK_DAYS
      : options.sinceDays;

  let query = client
    .from('tasks')
    .select('*')
    .eq('restaurant_id', resto.id)
    .order('created_at', { ascending: true });

  if (dateFilter) {
    query = query.eq('scheduled_for', dateFilter);
  } else if (sinceDays !== null && sinceDays !== false) {
    // Fenêtre récente + annexes non terminées (rollover) hors fenêtre.
    const cutoff = daysAgoYmd(sinceDays);
    query = query.or(
      `scheduled_for.gte.${cutoff},and(task_type.eq.annexe,completed.eq.false)`
    );
  }

  const { data, error } = await query;
  if (error) {
    rethrowMappedDbError(error);
  }

  return mapTaskRows(data);
}

/** Colonnes suffisantes pour le calendrier (grille + détail jour). */
const CALENDAR_TASK_COLUMNS = [
  'id',
  'title',
  'category',
  'priority',
  'task_type',
  'scheduled_for',
  'assigned_to',
  'deadline',
  'status',
  'completed',
  'post',
  'checklist_id',
  'checklist_item_key',
  'started_at',
  'proof_note',
  'created_at',
  'created_by',
  'completed_at',
  'completed_by',
].join(',');

/** Tâches planifiées entre deux dates incluses (YYYY-MM-DD). */
export async function getTasksInRange(startDate, endDate) {
  const resto = await getUserRestaurant();
  if (!resto) return [];
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from('tasks')
    .select(CALENDAR_TASK_COLUMNS)
    .eq('restaurant_id', resto.id)
    .gte('scheduled_for', startDate)
    .lte('scheduled_for', endDate)
    .order('scheduled_for', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    rethrowMappedDbError(error);
  }

  return mapTaskRows(data);
}

export async function saveTask(task) {
  const resto = await getUserRestaurant();
  if (!resto) return null;
  const client = getClient();
  if (!client) return null;

  const isExisting =
    typeof task.id === 'string' && task.id.length > 20;

  // Upsert exige INSERT + UPDATE en RLS : les employés n'ont que UPDATE → update() pour les lignes existantes.
  if (isExisting) {
    // Employé : n’envoie que les champs de progression (aligné trigger SQL P0).
    const dbTask =
      resto.role === 'employee'
        ? (() => {
            const norm = normalizeTaskFields(task);
            return {
              status: norm.status,
              completed: norm.completed,
              started_at: norm.startedAt,
              completed_at: norm.completedAt,
              completed_by: norm.completedBy,
              proof_note: task.proofNote || null,
            };
          })()
        : taskToDbPayload(resto, task);

    const { data, error } = await client
      .from('tasks')
      .update(dbTask)
      .eq('id', task.id)
      .eq('restaurant_id', resto.id)
      .select()
      .single();

    if (error) {
      console.error('Erreur saveTask (update):', error);
      throw error;
    }
    return mapTaskRows([data])[0];
  }

  const dbTask = taskToDbPayload(resto, task);
  const { data, error } = await client
    .from('tasks')
    .insert([dbTask])
    .select()
    .single();

  if (error) {
    console.error('Erreur saveTask (insert):', error);
    throw error;
  }

  return mapTaskRows([data])[0];
}

export async function saveTasks(tasksArray) {
  const client = getClient();
  if (!client || !Array.isArray(tasksArray) || tasksArray.length === 0) return [];
  const resto = await getUserRestaurant();
  if (!resto) return [];

  const payload = tasksArray.map((task) => {
    const dbTask = taskToDbPayload(resto, task);
    if (typeof task.id === 'string' && task.id.length > 20) {
      dbTask.id = task.id;
    }
    return dbTask;
  });

  const withId = payload.filter((row) => row.id);
  const withoutId = payload.filter((row) => !row.id);

  const rows = [];
  if (withoutId.length > 0) {
    const { data, error } = await client.from('tasks').insert(withoutId).select();
    if (error) {
      console.error('Erreur saveTasks (insert):', error);
      throw error;
    }
    rows.push(...(data || []));
  }
  for (const row of withId) {
    const { id, ...patch } = row;
    const { data, error } = await client
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .eq('restaurant_id', resto.id)
      .select()
      .maybeSingle();
    if (error) {
      console.error('Erreur saveTasks (update):', error);
      throw error;
    }
    if (data) rows.push(data);
  }

  const merged = mergeTasksWithUpsertRows(tasksArray, payload, rows);
  const mappedById = new Map(mapTaskRows(rows).map((row) => [row.id, row]));
  return merged.map((task) => (task.id && mappedById.get(task.id)) || task);
}

export async function deleteTask(taskId) {
  if (typeof taskId !== 'string') return;
  const client = getClient();
  if (!client) return;
  const { error } = await client.from('tasks').delete().eq('id', taskId);
  if (error) rethrowMappedDbError(error);
}

export async function deleteTasks(taskIds) {
  if (!Array.isArray(taskIds) || taskIds.length === 0) return;
  const ids = taskIds.filter((id) => typeof id === 'string' && id.length > 0);
  if (ids.length === 0) return;
  const client = getClient();
  if (!client) return;
  const { error } = await client.from('tasks').delete().in('id', ids);
  if (error) rethrowMappedDbError(error);
}

/**
 * TEAM MANAGEMENT
 */

export async function getTeamMembers() {
  const resto = await getUserRestaurant();
  if (!resto) return [];
  const client = getClient();
  if (!client) return [];

  let { data, error } = await client
    .from('user_roles')
    .select('user_id, role, display_name')
    .eq('restaurant_id', resto.id)
    .order('created_at', { ascending: true });

  if (error && /display_name/i.test(error.message || '')) {
    ({ data, error } = await client
      .from('user_roles')
      .select('user_id, role')
      .eq('restaurant_id', resto.id));
  }

  if (error) {
    console.error('getTeamMembers:', error);
    return [];
  }

  return (data || []).map((m) => ({
    userId: m.user_id,
    role: m.role,
    displayName: m.display_name || null,
  }));
}

/** Enregistre le prénom / nom d’affichage de l’utilisateur connecté. */
export async function setMyDisplayName(name) {
  const client = getClient();
  if (!client) throw new Error("Supabase n'est pas configuré.");
  const { data, error } = await client.rpc('set_my_display_name', {
    p_name: name,
  });
  if (error) {
    if (error.message?.includes('function') && error.message?.includes('does not exist')) {
      throw new Error(
        'Migration P1 manquante. Exécutez docs/supabase-p1-team-deadline.sql dans Supabase.'
      );
    }
    rethrowMappedDbError(error);
  }
  try {
    await client.auth.updateUser({ data: { member_display_name: data || name } });
  } catch (_) {
    /* metadata best-effort */
  }
  clearRestaurantCache();
  return data || name;
}

/** Gérant uniquement : promote / demote manager ↔ employee. */
export async function updateMemberRole(userId, role) {
  const client = getClient();
  if (!client) throw new Error("Supabase n'est pas configuré.");
  const { data, error } = await client.rpc('update_member_role', {
    p_user_id: userId,
    p_role: role,
  });
  if (error) {
    if (error.message?.includes('function') && error.message?.includes('does not exist')) {
      throw new Error(
        'Migration P1 manquante. Exécutez docs/supabase-p1-team-deadline.sql dans Supabase.'
      );
    }
    rethrowMappedDbError(error);
  }
  return data;
}

export async function getInviteCode() {
  const resto = await getUserRestaurant();
  if (!resto) return null;

  // Code rotatif en base (P0) ; fallback UUID legacy si migration non appliquée.
  if (resto.inviteCode) {
    return String(resto.inviteCode).toUpperCase();
  }

  try {
    const client = getClient();
    if (!client) return resto.id.substring(0, 8).toUpperCase();
    const { data, error } = await client.rpc('get_restaurant_invite_code');
    if (!error && data?.code) {
      clearRestaurantCache();
      return String(data.code).toUpperCase();
    }
  } catch (_) {
    /* migration pas encore appliquée */
  }

  return resto.id.substring(0, 8).toUpperCase();
}

/** Régénère le code d’invitation (expire dans p_valid_days jours). Manager+ only. */
export async function rotateInviteCode(validDays = 30) {
  const client = getClient();
  if (!client) throw new Error("Supabase n'est pas configuré.");
  const { data, error } = await client.rpc('rotate_restaurant_invite_code', {
    p_valid_days: validDays,
  });
  if (error) {
    if (error.message?.includes('function') && error.message?.includes('does not exist')) {
      throw new Error(
        'Migration P0 manquante. Exécutez docs/supabase-p0-hardening.sql dans Supabase.'
      );
    }
    rethrowMappedDbError(error);
  }
  clearRestaurantCache();
  return {
    code: data?.code ? String(data.code).toUpperCase() : null,
    expiresAt: data?.expires_at || null,
  };
}

/**
 * Accès employé : uniquement le code d’invitation (auth anonyme Supabase).
 * Sur le même appareil, la session est conservée — pas besoin de ressaisir le code.
 */
export async function enterTeamWithInviteCode(code, displayName = '') {
  const client = getClient();
  if (!client) throw new Error("Supabase n'est pas configuré.");

  const normalized = (code && String(code).trim().toUpperCase()) || '';
  if (normalized.length < 8) {
    throw new Error("Code d'invitation invalide (8 caractères).");
  }

  const cleanName = String(displayName || '').trim();
  if (cleanName.length < 2) {
    throw new Error('Indiquez votre prénom (2 caractères minimum).');
  }

  let { data: { session } } = await client.auth.getSession();
  if (session) {
    const existing = await fetchRestaurantByUserId(client, session.user.id);
    if (existing) {
      if (cleanName) {
        try {
          await setMyDisplayName(cleanName);
        } catch (_) {
          /* déjà nommé */
        }
      }
      return { status: 'already', restaurant: existing, displayName: cleanName };
    }
  }

  if (!session) {
    const { data, error } = await client.auth.signInAnonymously({
      options: { data: { member_display_name: cleanName } },
    });
    if (error) {
      if (
        error.message?.includes('anonymous') ||
        error.message?.includes('Anonymous sign-ins are disabled')
      ) {
        throw new Error(
          'Connexion équipe désactivée sur ce projet. Le gérant doit activer Authentication → Providers → Anonymous dans Supabase.'
        );
      }
      rethrowMappedDbError(error);
    }
    session = data?.session ?? null;
    if (!session) {
      throw new Error('Connexion équipe impossible. Réessayez.');
    }
  }

  await assertAuthUserSynced(client);
  const restaurant = await joinRestaurantByCode(normalized);
  try {
    await setMyDisplayName(cleanName);
  } catch (err) {
    console.warn('display_name non enregistré:', err);
  }
  return { status: 'joined', restaurant, displayName: cleanName };
}

export async function joinRestaurantByCode(code) {
  const client = getClient();
  if (!client) throw new Error("Supabase n'est pas configuré.");
  const { data: { session } } = await client.auth.getSession();
  if (!session) throw new Error('Non authentifié');
  await assertAuthUserSynced(client);

  const normalized = (code && String(code).trim()) || '';
  if (normalized.length < 8) {
    throw new Error("Code d'invitation invalide.");
  }

  const { data, error } = await client.rpc('join_restaurant_by_invite_code', {
    p_code: normalized,
  });

  if (error) {
    if (error.message?.includes('function') && error.message?.includes('does not exist')) {
      throw new Error(
        "Fonction Supabase manquante. Exécutez docs/supabase-dailydo-complete-fix.sql dans le SQL Editor Supabase."
      );
    }
    rethrowMappedDbError(error);
  }

  if (!data?.id) {
    throw new Error("Code d'invitation invalide.");
  }

  clearRestaurantCache();

  return { id: data.id, name: data.name };
}

// ─── Web Push (abonnements navigateur) ───────────────────────────────────────

function pushSubscriptionPayload(subscription, reminderHour, userId, restaurantId) {
  const json = subscription.toJSON();
  const keys = json.keys;
  if (!json.endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error('Abonnement push invalide.');
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';

  return {
    user_id: userId,
    restaurant_id: restaurantId,
    endpoint: json.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    reminder_hour: reminderHour,
    enabled: true,
    timezone,
    updated_at: new Date().toISOString(),
  };
}

export async function savePushSubscription(subscription, reminderHour) {
  const client = getClient();
  if (!client) throw new Error("Supabase n'est pas configuré.");
  const user = await assertAuthUserSynced(client);
  const resto = await getUserRestaurant();
  if (!resto?.id) throw new Error('Restaurant introuvable.');

  const { error } = await client.from('push_subscriptions').upsert(
    pushSubscriptionPayload(subscription, reminderHour, user.id, resto.id),
    { onConflict: 'user_id,endpoint' }
  );

  if (error) {
    if (error.message?.includes('push_subscriptions')) {
      throw new Error(
        'Table push_subscriptions manquante. Exécutez docs/supabase-push-notifications.sql dans Supabase.'
      );
    }
    rethrowMappedDbError(error);
  }
}

export async function updatePushReminderHour(reminderHour, endpoint) {
  const client = getClient();
  if (!client) return;
  const user = await assertAuthUserSynced(client);
  const hour = Math.min(23, Math.max(0, reminderHour));

  let query = client
    .from('push_subscriptions')
    .update({ reminder_hour: hour, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('enabled', true);

  if (endpoint) {
    query = query.eq('endpoint', endpoint);
  }

  const { error } = await query;
  if (error) console.warn('updatePushReminderHour:', error.message);
}

export async function disablePushSubscriptions() {
  const client = getClient();
  if (!client) return;
  const user = await assertAuthUserSynced(client);
  const { error } = await client
    .from('push_subscriptions')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('user_id', user.id);
  if (error) console.warn('disablePushSubscriptions:', error.message);
}

export async function disablePushSubscriptionByEndpoint(endpoint) {
  const client = getClient();
  if (!client || !endpoint) return;
  const user = await assertAuthUserSynced(client);
  const { error } = await client
    .from('push_subscriptions')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('endpoint', endpoint);
  if (error) console.warn('disablePushSubscriptionByEndpoint:', error.message);
}
