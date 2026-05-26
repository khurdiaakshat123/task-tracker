import { supabase, isSupabaseConfigured } from './supabase';
import { Task, CreateTaskInput, UpdateTaskInput } from '@/types/task';

const LOCAL_STORAGE_KEY = 'task-tracker-local-tasks';

// Get fallback tasks from local storage
const getLocalTasks = (): Task[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    // Return some beautiful seed data so the workspace looks alive on first open
    const defaultTasks: Task[] = [
      {
        id: 'seed-1',
        title: 'Configure Supabase variables',
        description: 'Set your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY inside .env.local to link this app to your Supabase backend.',
        is_completed: false,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        priority: 'high',
      },
      {
        id: 'seed-2',
        title: 'Run database setup script',
        description: 'Copy the contents of supabase-schema.sql and execute them in your Supabase SQL Editor to spin up the tasks table.',
        is_completed: false,
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        priority: 'medium',
      },
      {
        id: 'seed-3',
        title: 'Enjoy mock offline mode',
        description: 'While you setup Supabase, this app is fully functional using localStorage! Go ahead and add, edit, or delete tasks.',
        is_completed: true,
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        due_date: null,
        priority: 'low',
        completed_at: new Date(Date.now() - 3600000 * 47).toISOString(),
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultTasks));
    return defaultTasks;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
};

const saveLocalTasks = (tasks: Task[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
};

export const taskService = {
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }
    try {
      const { error } = await supabase.from('tasks').select('id').limit(1);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection failed' };
    }
  },

  async fetchTasks(): Promise<Task[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase fetch failed. Falling back to localStorage.', error);
          return getLocalTasks();
        }
        return data || [];
      } catch (err) {
        console.error('Supabase connection failed. Falling back to localStorage.', err);
        return getLocalTasks();
      }
    }
    return getLocalTasks();
  },

  async addTask(input: CreateTaskInput): Promise<Task> {
    const tempId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 11);

    const newTask: Task = {
      id: tempId,
      title: input.title,
      description: input.description || null,
      is_completed: false,
      created_at: new Date().toISOString(),
      due_date: input.due_date || null,
      priority: input.priority,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .insert([{
            title: input.title,
            description: input.description || null,
            due_date: input.due_date || null,
            priority: input.priority,
            is_completed: false
          }])
          .select()
          .single();

        if (error) {
          console.error('Supabase insert failed. Saving to localStorage.', error);
          const tasks = getLocalTasks();
          tasks.unshift(newTask);
          saveLocalTasks(tasks);
          return newTask;
        }
        return data;
      } catch (err) {
        console.error('Supabase connection failed on insert. Saving to localStorage.', err);
        const tasks = getLocalTasks();
        tasks.unshift(newTask);
        saveLocalTasks(tasks);
        return newTask;
      }
    }

    const tasks = getLocalTasks();
    tasks.unshift(newTask);
    saveLocalTasks(tasks);
    return newTask;
  },

  async updateTask(id: string, updates: UpdateTaskInput): Promise<Task> {
    const finalUpdates = { ...updates };
    if (updates.is_completed !== undefined) {
      finalUpdates.completed_at = updates.is_completed ? new Date().toISOString() : null;
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .update(finalUpdates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Supabase update failed. Appyling to localStorage.', error);
          const tasks = getLocalTasks();
          const idx = tasks.findIndex(t => t.id === id);
          if (idx !== -1) {
            tasks[idx] = { ...tasks[idx], ...finalUpdates } as Task;
            saveLocalTasks(tasks);
            return tasks[idx];
          }
          throw error;
        }
        return data;
      } catch (err) {
        console.error('Supabase connection failed on update. Applying to localStorage.', err);
        const tasks = getLocalTasks();
        const idx = tasks.findIndex(t => t.id === id);
        if (idx !== -1) {
          tasks[idx] = { ...tasks[idx], ...finalUpdates } as Task;
          saveLocalTasks(tasks);
          return tasks[idx];
        }
        throw err;
      }
    }

    const tasks = getLocalTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], ...finalUpdates } as Task;
      saveLocalTasks(tasks);
      return tasks[idx];
    }
    throw new Error('Task not found in offline database.');
  },

  async deleteTask(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Supabase delete failed. Applying to localStorage.', error);
          const tasks = getLocalTasks();
          const filtered = tasks.filter(t => t.id !== id);
          saveLocalTasks(filtered);
          return;
        }
        return;
      } catch (err) {
        console.error('Supabase connection failed on delete. Applying to localStorage.', err);
        const tasks = getLocalTasks();
        const filtered = tasks.filter(t => t.id !== id);
        saveLocalTasks(filtered);
        return;
      }
    }

    const tasks = getLocalTasks();
    const filtered = tasks.filter(t => t.id !== id);
    saveLocalTasks(filtered);
  }
};
