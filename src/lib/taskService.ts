import { supabase, isSupabaseConfigured } from './supabase';
import { Task, CreateTaskInput, UpdateTaskInput } from '@/types/task';

const LOCAL_STORAGE_KEY = 'task-tracker-local-tasks';

// Helper to generate 7 realistic demo tasks to showcase the application features
const generateDemoTasks = (userId: string): Task[] => {
  const getPastDateStr = (daysAgo: number) => {
    return new Date(Date.now() - 3600000 * 24 * daysAgo).toISOString().split('T')[0];
  };
  
  const getFutureDateStr = (daysAhead: number) => {
    return new Date(Date.now() + 3600000 * 24 * daysAhead).toISOString().split('T')[0];
  };

  const getPastDateTime = (daysAgo: number) => {
    return new Date(Date.now() - 3600000 * 24 * daysAgo).toISOString();
  };

  return [
    {
      id: 'demo-1-' + userId,
      title: 'Fix Auth Session State Leak',
      description: 'Audit and patch authentication session storage leakage in React client-side lifecycle to secure multi-user environments.',
      is_completed: false,
      created_at: getPastDateTime(5),
      due_date: getPastDateStr(3),
      priority: 'high',
      user_id: userId
    },
    {
      id: 'demo-2-' + userId,
      title: 'Migrate Postgres Database Schema',
      description: 'Run the supabase-schema.sql script in the Supabase SQL editor to create columns and enable strict Row-Level Security (RLS) policies.',
      is_completed: false,
      created_at: getPastDateTime(4),
      due_date: getPastDateStr(1),
      priority: 'medium',
      user_id: userId
    },
    {
      id: 'demo-3-' + userId,
      title: 'Optimize Donut Chart Performance',
      description: 'Refactor SVGCircle calculations inside User Analysis dashboard to minimize renders during real-time filters.',
      is_completed: false,
      created_at: getPastDateTime(1),
      due_date: getFutureDateStr(2),
      priority: 'high',
      user_id: userId
    },
    {
      id: 'demo-4-' + userId,
      title: 'Update Developer Onboarding Docs',
      description: 'Write instructions for connecting other devices to local network address IP for testing purposes.',
      is_completed: false,
      created_at: getPastDateTime(0),
      due_date: getFutureDateStr(5),
      priority: 'low',
      user_id: userId
    },
    {
      id: 'demo-5-' + userId,
      title: 'Implement Tamas Productivity Score',
      description: 'Design math algorithms to normalize backlog weight indices and cap extreme outliers.',
      is_completed: true,
      created_at: getPastDateTime(3),
      due_date: getPastDateStr(1),
      priority: 'high',
      completed_at: getPastDateTime(2),
      user_id: userId
    },
    {
      id: 'demo-6-' + userId,
      title: 'Design Glassmorphic Auth Screen',
      description: 'Stylize a high-fidelity sign-in/register form with interactive borders and custom glows.',
      is_completed: true,
      created_at: getPastDateTime(2),
      due_date: getPastDateStr(1),
      priority: 'medium',
      completed_at: getPastDateTime(2),
      user_id: userId
    },
    {
      id: 'demo-7-' + userId,
      title: 'Setup Tailwind CSS v4.0 Layout',
      description: 'Configure index.css styling tokens, glass backgrounds, and standard animations.',
      is_completed: true,
      created_at: getPastDateTime(6),
      due_date: getPastDateStr(4),
      priority: 'medium',
      completed_at: getPastDateTime(1),
      user_id: userId
    }
  ];
};

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
  const onboardedKey = `task-tracker-onboarded-${userId}`;
  const hasOnboarded = localStorage.getItem(onboardedKey) === 'true';

  if (userTasks.length === 0 && !hasOnboarded) {
    // Return some beautiful onboarding seed data for the user
    const defaultTasks = generateDemoTasks(userId);
    
    // Save these seed tasks so they persist in the shared localStorage
    const mergedTasks = [...allTasks, ...defaultTasks];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mergedTasks));
    localStorage.setItem(onboardedKey, 'true');
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
  
  // Set onboarded flag to prevent re-seeding empty state
  localStorage.setItem(`task-tracker-onboarded-${userId}`, 'true');
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

        const onboardedKey = `task-tracker-onboarded-${userId}`;
        const hasOnboarded = typeof window !== 'undefined' && localStorage.getItem(onboardedKey) === 'true';

        if (data && data.length === 0 && !hasOnboarded) {
          const demoTasks = generateDemoTasks(userId);
          const { data: seededData, error: seedError } = await supabase
            .from('tasks')
            .insert(demoTasks.map(t => ({
              title: t.title,
              description: t.description,
              is_completed: t.is_completed,
              created_at: t.created_at,
              due_date: t.due_date,
              priority: t.priority,
              completed_at: t.completed_at,
              user_id: t.user_id
            })))
            .select();

          if (seedError) {
            console.error('Failed to seed demo tasks in Supabase:', seedError);
            return [];
          }

          if (typeof window !== 'undefined') {
            localStorage.setItem(onboardedKey, 'true');
          }
          return seededData || demoTasks;
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
  },

  async deleteAllTasks(userId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('user_id', userId);

        if (error) {
          console.error('Supabase delete all failed. Applying to localStorage.', error);
          saveLocalTasks([], userId);
          return;
        }
        return;
      } catch (err) {
        console.error('Supabase connection failed on delete all. Applying to localStorage.', err);
        saveLocalTasks([], userId);
        return;
      }
    }

    saveLocalTasks([], userId);
  }
};
