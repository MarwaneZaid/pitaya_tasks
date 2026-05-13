import { supabase, getSupabase } from './storage-supabase';
import { mergeTasksWithUpsertRows } from './saveTasksMerge';

function getClient() {
  return getSupabase() || supabase;
}

/** Valide le JWT auprès du serveur Auth (évite les RPC avec une session locale orpheline ou un mauvais projet). */
async function assertAuthUserSynced(client) {
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user?.id) {
    throw new Error('Session invalide ou expirée. Déconnectez-vous et reconnectez-vous.');
  }
  return user;
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
  const { data: role, error } = await client
    .from('user_roles')
    .select('restaurant_id, role, restaurants(name)')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !role) return null;

  let name = nameFromRestaurantsEmbed(role.restaurants);
  if (!name) {
    name = await fetchRestaurantNameById(client, role.restaurant_id);
  }

  const restaurant = {
    id: role.restaurant_id,
    name: name || '',
    role: role.role
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
  const { data: { session } } = await client.auth.getSession();
  if (!session) return null;

  if (
    cachedRestaurant &&
    Date.now() - cachedRestaurantAt < RESTAURANT_CACHE_MS
  ) {
    return cachedRestaurant;
  }

  if (inflightUserRestaurant) return inflightUserRestaurant;

  inflightUserRestaurant = (async () => {
    try {
      return fetchRestaurantByUserId(client, session.user.id);
    } finally {
      inflightUserRestaurant = null;
    }
  })();

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

export async function getTasks(dateFilter = null) {
  const resto = await getUserRestaurant();
  if (!resto) return [];
  const client = getClient();
  if (!client) return [];

  let query = client
    .from('tasks')
    .select('*')
    .eq('restaurant_id', resto.id)
    .order('created_at', { ascending: true });

  if (dateFilter) {
    query = query.eq('scheduled_for', dateFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Erreur getTasks:", error);
    return [];
  }

  // Adapter le format DB au format Frontend
  return data.map(t => ({
    id: t.id,
    title: t.title,
    category: t.category,
    priority: t.priority,
    taskType: t.task_type,
    scheduledFor: t.scheduled_for,
    assignedTo: t.assigned_to,
    completed: t.completed,
    createdAt: t.created_at,
    createdBy: t.created_by,
    completedAt: t.completed_at,
    completedBy: t.completed_by
  }));
}

export async function saveTask(task) {
  const resto = await getUserRestaurant();
  if (!resto) return null;
  const client = getClient();
  if (!client) return null;

  const dbTask = {
    restaurant_id: resto.id,
    title: task.title,
    category: task.category || 'nettoyage',
    priority: task.priority || 'moyenne',
    task_type: task.taskType || 'quotidien',
    scheduled_for: task.scheduledFor,
    assigned_to: task.assignedTo || null,
    completed: task.completed || false,
    created_by: task.createdBy,
    completed_at: task.completedAt || null,
    completed_by: task.completedBy || null
  };

  // Si l'ID est un nombre (nouveau via Date.now()), on l'omet pour laisser UUID générer,
  // sinon on l'update.
  if (typeof task.id === 'string' && task.id.length > 20) {
    dbTask.id = task.id;
  }

  const { data, error } = await client
    .from('tasks')
    .upsert([dbTask], { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error("Erreur saveTask:", error);
    throw error;
  }

  return { ...task, id: data.id };
}

export async function saveTasks(tasksArray) {
  const client = getClient();
  if (!client || !Array.isArray(tasksArray) || tasksArray.length === 0) return [];
  const resto = await getUserRestaurant();
  if (!resto) return [];

  const payload = tasksArray.map((task) => {
    const dbTask = {
      restaurant_id: resto.id,
      title: task.title,
      category: task.category || 'nettoyage',
      priority: task.priority || 'moyenne',
      task_type: task.taskType || 'quotidien',
      scheduled_for: task.scheduledFor,
      assigned_to: task.assignedTo || null,
      completed: task.completed || false,
      created_by: task.createdBy,
      completed_at: task.completedAt || null,
      completed_by: task.completedBy || null
    };
    if (typeof task.id === 'string' && task.id.length > 20) {
      dbTask.id = task.id;
    }
    return dbTask;
  });

  const { data, error } = await client
    .from('tasks')
    .upsert(payload, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('Erreur saveTasks:', error);
    throw error;
  }

  return mergeTasksWithUpsertRows(tasksArray, payload, data);
}

export async function deleteTask(taskId) {
  if (typeof taskId !== 'string') return;
  const client = getClient();
  if (!client) return;
  await client.from('tasks').delete().eq('id', taskId);
}

export async function deleteTasks(taskIds) {
  if (!Array.isArray(taskIds) || taskIds.length === 0) return;
  const ids = taskIds.filter((id) => typeof id === 'string' && id.length > 0);
  if (ids.length === 0) return;
  const client = getClient();
  if (!client) return;
  await client.from('tasks').delete().in('id', ids);
}

/**
 * TEAM MANAGEMENT
 */

export async function getTeamMembers() {
  const resto = await getUserRestaurant();
  if (!resto) return [];
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client
    .from('user_roles')
    .select('user_id, role')
    .eq('restaurant_id', resto.id);

  if (error) {
    console.error('getTeamMembers:', error);
    return [];
  }
  return data;
}

export async function getInviteCode() {
  const resto = await getUserRestaurant();
  if (!resto) return null;

  // On utilise l'ID du restaurant comme base du code d'invitation (les 8 premiers chars de l'UUID)
  return resto.id.substring(0, 8).toUpperCase();
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
