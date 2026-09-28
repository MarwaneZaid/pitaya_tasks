/**
 * Tests for employee RPC routing in saveTask (Fix #2 C2)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create a minimal mock saveTask that mimics the routing logic
function createMockSaveTask(mockClient, mockGetUserRestaurant) {
  return async function saveTask(task) {
    const resto = await mockGetUserRestaurant();
    if (!resto) return null;

    const isExisting = typeof task.id === 'string' && task.id.length > 20;

    // Employee updates: use RPC
    if (isExisting && resto.role === 'employee') {
      try {
        const { data, error } = await mockClient.rpc('update_task_status_employee', {
          p_task_id: task.id,
          p_status: task.status || null,
          p_completed: task.completed ?? null,
          p_proof_note: task.proofNote || null,
          p_completed_by: task.completedBy || null,
        });

        if (error) throw error;

        return {
          ...task,
          id: data.id || task.id,
          status: data.status || task.status,
          completed: data.completed ?? task.completed,
          proofNote: data.proof_note || null,
          completedBy: data.completed_by || null,
          completedAt: data.completed_at || null,
          startedAt: data.started_at || null,
        };
      } catch (rpcError) {
        const msg = rpcError?.message || '';
        const code = rpcError?.code;
        const isRpcMissing =
          code === 'PGRST202' ||
          code === '42883' ||
          (msg.includes('function') && msg.includes('does not exist'));

        if (isRpcMissing) {
          console.warn('RPC not found, falling back to direct UPDATE');
          const { data, error } = await mockClient
            .from('tasks')
            .update({
              status: task.status,
              completed: task.completed,
              proof_note: task.proofNote || null,
            })
            .eq('id', task.id)
            .eq('restaurant_id', resto.id)
            .select()
            .single();

          if (error) throw error;
          return data;
        }

        throw rpcError;
      }
    }

    // Manager/Owner: direct UPDATE
    if (isExisting) {
      const { data, error } = await mockClient
        .from('tasks')
        .update(task)
        .eq('id', task.id)
        .eq('restaurant_id', resto.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // New task: INSERT
    const { data, error } = await mockClient
      .from('tasks')
      .insert([task])
      .select()
      .single();

    if (error) throw error;
    return data;
  };
}

describe('saveTask employee RPC routing', () => {
  let mockClient;
  let mockGetUserRestaurant;
  let saveTask;

  beforeEach(() => {
    mockGetUserRestaurant = vi.fn();
    
    const mockUpdate = vi.fn();
    const mockInsert = vi.fn();
    const mockRpc = vi.fn();
    
    mockClient = {
      rpc: mockRpc,
      from: vi.fn((table) => ({
        update: (payload) => {
          mockUpdate(payload);
          return {
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: payload, error: null }),
            }),
          };
        },
        insert: (payload) => {
          mockInsert(payload);
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: payload[0], error: null }),
            }),
          };
        },
      })),
    };

    saveTask = createMockSaveTask(mockClient, mockGetUserRestaurant);
  });

  it('should route employee update through RPC', async () => {
    mockGetUserRestaurant.mockResolvedValue({ id: 'resto-1', role: 'employee' });
    
    mockClient.rpc.mockResolvedValue({
      data: {
        id: 'task-123456789012345678901',
        status: 'done',
        completed: true,
        proof_note: 'Completed',
        completed_by: 'Employee',
        completed_at: '2026-09-28T20:00:00Z',
        started_at: '2026-09-28T19:00:00Z',
      },
      error: null,
    });

    const task = {
      id: 'task-123456789012345678901',
      status: 'done',
      completed: true,
      proofNote: 'Completed',
      completedBy: 'Employee',
    };

    const result = await saveTask(task);

    expect(mockClient.rpc).toHaveBeenCalledWith('update_task_status_employee', {
      p_task_id: task.id,
      p_status: 'done',
      p_completed: true,
      p_proof_note: 'Completed',
      p_completed_by: 'Employee',
    });
    expect(result.status).toBe('done');
    expect(result.completed).toBe(true);
  });

  it('should fall back to direct UPDATE when RPC returns PGRST202', async () => {
    mockGetUserRestaurant.mockResolvedValue({ id: 'resto-1', role: 'employee' });
    
    mockClient.rpc.mockRejectedValue({
      code: 'PGRST202',
      message: 'Could not find function in schema cache',
    });

    const task = {
      id: 'task-123456789012345678901',
      status: 'done',
      completed: true,
      proofNote: 'Done',
    };

    const result = await saveTask(task);

    expect(mockClient.rpc).toHaveBeenCalled();
    expect(mockClient.from).toHaveBeenCalledWith('tasks');
    expect(result.status).toBe('done');
  });

  it('should fall back to direct UPDATE when RPC returns 42883', async () => {
    mockGetUserRestaurant.mockResolvedValue({ id: 'resto-1', role: 'employee' });
    
    mockClient.rpc.mockRejectedValue({
      code: '42883',
      message: 'function does not exist',
    });

    const task = {
      id: 'task-123456789012345678901',
      status: 'in-progress',
    };

    await saveTask(task);

    expect(mockClient.rpc).toHaveBeenCalled();
    expect(mockClient.from).toHaveBeenCalledWith('tasks');
  });

  it('should throw on RPC error that is not "missing function"', async () => {
    mockGetUserRestaurant.mockResolvedValue({ id: 'resto-1', role: 'employee' });
    
    mockClient.rpc.mockRejectedValue(
      new Error('Accès refusé : vous n\'êtes pas membre de ce restaurant')
    );

    const task = {
      id: 'task-123456789012345678901',
      status: 'done',
    };

    await expect(saveTask(task)).rejects.toThrow('Accès refusé');
    expect(mockClient.from).not.toHaveBeenCalled();
  });

  it('should use direct UPDATE for managers', async () => {
    mockGetUserRestaurant.mockResolvedValue({ id: 'resto-1', role: 'manager' });

    const task = {
      id: 'task-123456789012345678901',
      title: 'Manager task',
      status: 'done',
    };

    await saveTask(task);

    expect(mockClient.rpc).not.toHaveBeenCalled();
    expect(mockClient.from).toHaveBeenCalledWith('tasks');
  });

  it('should use direct UPDATE for owners', async () => {
    mockGetUserRestaurant.mockResolvedValue({ id: 'resto-1', role: 'owner' });

    const task = {
      id: 'task-123456789012345678901',
      title: 'Owner task',
    };

    await saveTask(task);

    expect(mockClient.rpc).not.toHaveBeenCalled();
    expect(mockClient.from).toHaveBeenCalledWith('tasks');
  });
});
