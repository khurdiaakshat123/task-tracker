import { supabase, isSupabaseConfigured } from './supabase';
import { Task, CreateTaskInput, UpdateTaskInput } from '@/types/task';

const LOCAL_STORAGE_KEY = 'task-tracker-local-tasks';

// Get fallback tasks from local storage scoped to current user
const getLocalTasks = (userId: string): Task[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  let allTasks: Task[] = [];
  if (stored) {
    try {
      allTasks = JSON.parse(stored);
    } catch (e) {
      allTasks = [];
    }
  }

  // Check if current user has any tasks
  const userTasks = allTasks.filter(t => t.user_id === userId);

  if (userTasks.length === 0) {
    // Return some beautiful onboarding seed data for the user
    const defaultTasks: Task[] = [
      {
        id: 'seed-1-' + userId,
        title: 'Configure Supabase variables',
        description: 'Set your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY inside .env.local to link this app to your Supabase backend.',
        is_completed: false,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        due_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        priority: 'high',
        user_id: userId
      },
      {
        id: 'seed-2-' + userId,
        title: 'Run database setup script',
        description: 'Copy the contents of supabase-schema.sql and execute them in your Supabase SQL Editor to spin up the tasks table with user isolation.',
        is_completed: false,
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        due_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        priority: 'medium',
        user_id: userId
      },
      {
        id: 'seed-3-' + userId,
        title: 'Enjoy private tasks',
        description: 'Authentication is fully active! Your tasks are private and isolated to your account. Switch accounts or log out to see task security in action.',
        is_completed: true,
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
        due_date: null,
        priority: 'low',
        completed_at: new Date(Date.now() - 3600000 * 47).toISOString(),
        user_id: userId
      }
    ];
    
    // Save these seed tasks so they persist in the shared localStorage
    const mergedTasks = [...allTasks, ...defaultTasks];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedTasks));
    return defaultTasks;
  }
  
  return userTasks;
};

const saveLocalTasks = (updatedUserTasks: Task[], userId: string) => {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  let allTasks: Task[] = [];
  if (stored) {
    try {
      allTasks = JSON.parse(stored);
    } catch (e) {
      allTasks = [];
    }
  }
  // Keep only tasks that do NOT belong to this user
  const otherUsersTasks = allTasks.filter(t => t.user_id !== userId);
  // Merge and save
  const mergedTasks = [...updatedUserTasks, ...otherUsersTasks];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedTasks));
};

export const taskService = {
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }
    try {
      // Select both id and user_id to verify the authentication schema is fully set up
      const { error } = await supabase.from('tasks').select('id, user_id').limit(1);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection failed' };
    }
  },

  async fetchTasks(userId: string): Promise<Task[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase fetch failed. Falling back to localStorage.', error);
          return getLocalTasks(userId);
        }
        return data || [];
      } catch (err) {
        console.error('Supabase connection failed. Falling back to localStorage.', err);
        return getLocalTasks(userId);
      }
    }
    return getLocalTasks(userId);
  },

  async addTask(input: CreateTaskInput, userId: string): Promise<Task> {
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
      user_id: userId
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
            is_completed: false,
            user_id: userId
          }])
          .select()
          .single();

        if (error) {
          console.error('Supabase insert failed. Saving to localStorage.', error);
          const tasks = getLocalTasks(userId);
          tasks.unshift(newTask);
          saveLocalTasks(tasks, userId);
          return newTask;
        }
        return data;
      } catch (err) {
        console.error('Supabase connection failed on insert. Saving to localStorage.', err);
        const tasks = getLocalTasks(userId);
        tasks.unshift(newTask);
        saveLocalTasks(tasks, userId);
        return newTask;
      }
    }

    const tasks = getLocalTasks(userId);
    tasks.unshift(newTask);
    saveLocalTasks(tasks, userId);
    return newTask;
  },

  async updateTask(id: string, updates: UpdateTaskInput, userId: string): Promise<Task> {
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
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          console.error('Supabase update failed. Applying to localStorage.', error);
          const tasks = getLocalTasks(userId);
          const idx = tasks.findIndex(t => t.id === id);
          if (idx !== -1) {
            tasks[idx] = { ...tasks[idx], ...finalUpdates } as Task;
            saveLocalTasks(tasks, userId);
            return tasks[idx];
          }
          throw error;
        }
        return data;
      } catch (err) {
        console.error('Supabase connection failed on update. Applying to localStorage.', err);
        const tasks = getLocalTasks(userId);
        const idx = tasks.findIndex(t => t.id === id);
        if (idx !== -1) {
          tasks[idx] = { ...tasks[idx], ...finalUpdates } as Task;
          saveLocalTasks(tasks, userId);
          return tasks[idx];
        }
        throw err;
      }
    }

    const tasks = getLocalTasks(userId);
    const idx = tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], ...finalUpdates } as Task;
      saveLocalTasks(tasks, userId);
      return tasks[idx];
    }
    throw new Error('Task not found in offline database.');
  },

  async deleteTask(id: string, userId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', id)
          .eq('user_id', userId);

        if (error) {
          console.error('Supabase delete failed. Applying to localStorage.', error);
          const tasks = getLocalTasks(userId);
          const filtered = tasks.filter(t => t.id !== id);
          saveLocalTasks(filtered, userId);
          return;
        }
        return;
      } catch (err) {
        console.error('Supabase connection failed on delete. Applying to localStorage.', err);
        const tasks = getLocalTasks(userId);
        const filtered = tasks.filter(t => t.id !== id);
        saveLocalTasks(filtered, userId);
        return;
      }
    }

    const tasks = getLocalTasks(userId);
    const filtered = tasks.filter(t => t.id !== id);
    saveLocalTasks(filtered, userId);
  }
};
