import { useEffect, useRef } from 'react';
import { mapTaskRows } from '../lib/taskRowMap';

/**
 * Abonnement Realtime coalescé : applique INSERT/UPDATE/DELETE localement,
 * avec un refetch ponctuel si le patch échoue.
 */
export function useTaskRealtime({
  supabase,
  restaurantId,
  enabled,
  onPatch,
  onNeedRefresh,
  coalesceMs = 280,
}) {
  const channelRef = useRef(null);
  const queueRef = useRef([]);
  const timerRef = useRef(null);
  const onPatchRef = useRef(onPatch);
  const onNeedRefreshRef = useRef(onNeedRefresh);

  useEffect(() => {
    onPatchRef.current = onPatch;
    onNeedRefreshRef.current = onNeedRefresh;
  }, [onPatch, onNeedRefresh]);

  useEffect(() => {
    if (!supabase || !restaurantId || !enabled) return undefined;

    const flush = () => {
      timerRef.current = null;
      const batch = queueRef.current;
      queueRef.current = [];
      if (batch.length === 0) return;

      try {
        onPatchRef.current?.((prev) => applyRealtimeBatch(prev || [], batch));
      } catch (err) {
        console.warn('Realtime patch failed, refreshing:', err);
        onNeedRefreshRef.current?.();
      }
    };

    const schedule = (payload) => {
      queueRef.current.push(payload);
      if (timerRef.current) return;
      timerRef.current = setTimeout(flush, coalesceMs);
    };

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`tasks:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => schedule(payload)
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      queueRef.current = [];
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [supabase, restaurantId, enabled, coalesceMs]);
}

function applyRealtimeBatch(prev, batch) {
  let next = [...prev];
  const byId = new Map(next.map((t) => [t.id, t]));

  for (const payload of batch) {
    const event = payload.eventType || payload.event;
    if (event === 'DELETE') {
      const id = payload.old?.id;
      if (id) byId.delete(id);
      continue;
    }

    const row = payload.new;
    if (!row?.id) {
      // Payload incomplet → laisse le caller refetch
      throw new Error('incomplete realtime payload');
    }
    const mapped = mapTaskRows([row])[0];
    byId.set(mapped.id, mapped);
  }

  next = Array.from(byId.values());
  return next;
}
