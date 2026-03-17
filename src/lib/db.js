import { supabase, getSupabase } from './storage-supabase';

function getClient() {
  return getSupabase() || supabase;
}

export async function getUserRestaurant() {
  const client = getClient();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  if (!session) return null;

  const { data: role, error } = await client
    .from('user_roles')
    .select('restaurant_id, role, restaurants(name)')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error || !role) return null;

  return {
    id: role.restaurant_id,
    name: role.restaurants.name,
    role: role.role
  };
}

const RPC_TIMEOUT_MS = 15000;

export async function createRestaurant(name) {
  const client = getClient();
  if (!client) throw new Error("Supabase n'est pas configuré.");
  const { data: { session } } = await client.auth.getSession();
  if (!session) throw new Error("Non authentifié");

  const rpcPromise = client.rpc('create_restaurant', { p_name: name });
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Délai dépassé. Vérifiez votre connexion ou exécutez le script SQL create_restaurant dans Supabase.")), RPC_TIMEOUT_MS)
  );
  try {
    const result = await Promise.race([rpcPromise, timeoutPromise]);
    const { data, error } = result;
    if (error) {
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        throw new Error("Fonction Supabase manquante. Exécutez docs/supabase-fix-restaurants-rls.sql dans le SQL Editor Supabase.");
      }
      throw error;
    }
    return { id: data?.id };
  } catch (e) {
    throw e;
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
  for (const task of tasksArray) {
    await saveTask(task);
  }
}

export async function deleteTask(taskId) {
  if (typeof taskId !== 'string') return;
  const client = getClient();
  if (!client) return;
  await client.from('tasks').delete().eq('id', taskId);
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

  // Chercher le restaurant dont l'ID commence par ce code
  const { data: restos, error } = await client
    .from('restaurants')
    .select('id, name')
    .ilike('id', `${code.toLowerCase()}%`);

  if (error || !restos || restos.length === 0) {
    throw new Error("Code d'invitation invalide.");
  }

  const resto = restos[0];

  // Vérifier si déjà membre
  const { data: existing } = await client
    .from('user_roles')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (existing) throw new Error("Vous êtes déjà membre d'un restaurant.");

  // Rejoindre comme employé
  const { error: joinError } = await client
    .from('user_roles')
    .insert({
      user_id: session.user.id,
      restaurant_id: resto.id,
      role: 'employee'
    });

  if (joinError) throw joinError;

  return resto;
}
