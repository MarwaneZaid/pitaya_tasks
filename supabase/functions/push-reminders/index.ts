import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

function getLocalHourAndDate(timezone) {
  const tz = timezone || 'Europe/Paris';
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat('fr-FR', {
      hour: 'numeric',
      hour12: false,
      timeZone: tz,
    }).format(now)
  );
  const dateYmd = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now);
  return { hour, dateYmd };
}

function buildNotificationPayload(tasks, dateYmd, siteName) {
  const pending = (tasks || []).filter(
    (t) => t.status !== 'done' && !t.completed && String(t.title || '').trim()
  );
  if (pending.length === 0) return null;

  const title = siteName ? `${siteName} — tâches du jour` : 'DailyDo — tâches du jour';
  const lines = pending.slice(0, 5).map((t) => `• ${String(t.title).trim()}`);
  const more =
    pending.length > 5 ? `\n… et ${pending.length - 5} autre(s)` : '';
  const body = `${pending.length} tâche(s) planifiée(s) :\n${lines.join('\n')}${more}`;

  return {
    title,
    body,
    tag: 'dailydo-planned-tasks',
    url: '/',
  };
}

async function sendPush(sub, payload, vapidSubject, vapidPublic, vapidPrivate) {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  await webpush.sendNotification(
    {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    },
    JSON.stringify(payload)
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret) {
    const header = req.headers.get('x-cron-secret');
    if (header !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@dailydo-saas.app';

  if (!vapidPublic || !vapidPrivate) {
    return new Response(JSON.stringify({ error: 'VAPID keys missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select(
      'id, endpoint, p256dh, auth, restaurant_id, reminder_hour, last_notified_date, timezone'
    )
    .eq('enabled', true);

  if (subsError) {
    return new Response(JSON.stringify({ error: subsError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let sent = 0;
  let skipped = 0;
  const errors = [];

  for (const sub of subs || []) {
    const { hour, dateYmd } = getLocalHourAndDate(sub.timezone);
    if (hour !== sub.reminder_hour) {
      skipped += 1;
      continue;
    }
    if (sub.last_notified_date === dateYmd) {
      skipped += 1;
      continue;
    }

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('title, status, completed, scheduled_for')
      .eq('restaurant_id', sub.restaurant_id)
      .eq('scheduled_for', dateYmd);

    if (tasksError) {
      errors.push({ id: sub.id, error: tasksError.message });
      continue;
    }

    const { data: resto } = await supabase
      .from('restaurants')
      .select('name')
      .eq('id', sub.restaurant_id)
      .maybeSingle();

    const payload = buildNotificationPayload(tasks, dateYmd, resto?.name);
    if (!payload) {
      skipped += 1;
      continue;
    }

    try {
      await sendPush(sub, payload, vapidSubject, vapidPublic, vapidPrivate);
      await supabase
        .from('push_subscriptions')
        .update({ last_notified_date: dateYmd, updated_at: new Date().toISOString() })
        .eq('id', sub.id);
      sent += 1;
    } catch (e) {
      const statusCode = e?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      }
      errors.push({ id: sub.id, error: String(e?.message || e) });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, skipped, errors }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
