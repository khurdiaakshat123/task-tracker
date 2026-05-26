'use client';

import React, { useState, useEffect } from 'react';
import { Task, CreateTaskInput, UpdateTaskInput, Priority } from '@/types/task';
import { taskService } from '@/lib/taskService';
import { isSupabaseConfigured } from '@/lib/supabase';
import TaskStats from '@/components/TaskStats';
import TaskForm from '@/components/TaskForm';
import TaskCard from '@/components/TaskCard';
import { 
  Database, 
  Sparkles, 
  AlertTriangle, 
  CheckSquare, 
  Search, 
  SlidersHorizontal, 
  Loader2, 
  Plus, 
  X,
  FileCode,
  PieChart,
  LayoutGrid,
  BarChart3,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [currentView, setCurrentView] = useState<'board' | 'analysis'>('board');
  
  // Database connection check states
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'failed' | 'local'>('checking');
  const [dbError, setDbError] = useState<string | null>(null);
  const [showTamasCalc, setShowTamasCalc] = useState(false);
  
  // Filter and Sort states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>(['low', 'medium', 'high']);

  // Load tasks on mount
  useEffect(() => {
    async function loadTasks() {
      try {
        if (!isSupabaseConfigured) {
          setDbStatus('local');
        } else {
          const conn = await taskService.testConnection();
          if (conn.success) {
            setDbStatus('connected');
          } else {
            setDbStatus('failed');
            setDbError(conn.error || 'Unknown connection error');
          }
        }
        const fetched = await taskService.fetchTasks();
        setTasks(fetched);
      } catch (err) {
        console.error('Failed to load tasks:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  const [dateTime, setDateTime] = useState<Date | null>(null);

  useEffect(() => {
    setDateTime(new Date());
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatHeaderDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatHeaderTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // Handlers
  const handleAddTask = async (data: CreateTaskInput) => {
    setSubmitting(true);
    try {
      const newTask = await taskService.addTask(data);
      setTasks((prev) => [newTask, ...prev]);
    } catch (err) {
      console.error('Failed to add task:', err);
      alert('Error creating task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTask = async (id: string, updates: UpdateTaskInput) => {
    try {
      const updated = await taskService.updateTask(id, updates);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      if (editingTask?.id === id) {
        setEditingTask(null);
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      alert('Error updating task.');
    }
  };

  const handleEditSubmit = async (data: any) => {
    if (!editingTask) return;
    setSubmitting(true);
    try {
      await handleUpdateTask(editingTask.id, data);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (id: string, isCompleted: boolean) => {
    await handleUpdateTask(id, { is_completed: isCompleted });
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await taskService.deleteTask(id);
        setTasks((prev) => prev.filter((t) => t.id !== id));
      } catch (err) {
        console.error('Failed to delete task:', err);
        alert('Error deleting task.');
      }
    }
  };

  const togglePriorityFilter = (priority: Priority) => {
    setPriorityFilter((prev) => {
      if (prev.includes(priority)) {
        return prev.filter((p) => p !== priority);
      } else {
        return [...prev, priority];
      }
    });
  };

  // Filtered and Sorted list
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = 
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'completed' && task.is_completed) ||
      (statusFilter === 'pending' && !task.is_completed);

    const matchesPriority = priorityFilter.includes(task.priority);

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Helper to check if a task is overdue (not completed and due date in the past)
  const isOverdue = (task: Task) => {
    if (!task.due_date || task.is_completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.due_date);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Rule 1: Priority high > medium > low (1st priority)
    const priorityWeights = { high: 3, medium: 2, low: 1 };
    const aWeight = priorityWeights[a.priority] || 0;
    const bWeight = priorityWeights[b.priority] || 0;
    if (aWeight !== bWeight) {
      return bWeight - aWeight; // High priority values sort higher (earlier in list)
    }

    // Rule 2: Earlier due dates/creation dates on top (2nd priority)
    if (a.due_date && b.due_date) {
      const aTime = new Date(a.due_date).getTime();
      const bTime = new Date(b.due_date).getTime();
      if (aTime !== bTime) {
        return aTime - bTime; // Ascending order: earlier due date first
      }
    } else if (a.due_date) {
      return -1; // Task with a due date is treated as earlier than one without
    } else if (b.due_date) {
      return 1;
    }

    // Fallback: compare created_at (earlier created task first)
    const aCreated = new Date(a.created_at).getTime();
    const bCreated = new Date(b.created_at).getTime();
    return aCreated - bCreated;
  });

  // Separate tasks into three partitions: Overdue, Remaining, and Completed
  const overdueTasks = sortedTasks.filter((t) => !t.is_completed && isOverdue(t));
  const remainingTasks = sortedTasks.filter((t) => !t.is_completed && !isOverdue(t));
  const completedTasks = sortedTasks.filter((t) => t.is_completed);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col min-h-screen">
      {/* Upper Header Bar */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-zinc-800/80">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <CheckSquare className="text-white stroke-[2.5]" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              ApexTask
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                v1.0
              </span>
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">Streamlined workflow organizer</p>
          </div>
          <div className="h-6 w-px bg-zinc-850 hidden sm:block mx-1" />
          <button
            onClick={() => setCurrentView((v) => (v === 'board' ? 'analysis' : 'board'))}
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-800 text-zinc-350 hover:text-white hover:bg-zinc-850 cursor-pointer transition-all shadow-sm shadow-black/10"
          >
            {currentView === 'board' ? (
              <>
                <PieChart size={13} className="text-indigo-400" />
                <span>User Analysis</span>
              </>
            ) : (
              <>
                <LayoutGrid size={13} className="text-indigo-400" />
                <span>Back to Board</span>
              </>
            )}
          </button>
        </div>

        {/* Date, Time and Connection Status */}
        <div className="flex flex-col items-start sm:items-end gap-2 self-stretch sm:self-center">
          {dateTime && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 tracking-wider">
              <span>{formatHeaderDate(dateTime)}</span>
              <span className="text-zinc-650">•</span>
              <span className="font-mono text-zinc-355">{formatHeaderTime(dateTime)}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            {dbStatus === 'checking' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-800/40 text-zinc-400 border border-zinc-800 text-xs font-semibold">
                <Loader2 size={13} className="animate-spin" />
                <span>Checking Database...</span>
              </div>
            )}
            {dbStatus === 'connected' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                <Database size={13} className="animate-pulse" />
                <span>Supabase Connected</span>
              </div>
            )}
            {dbStatus === 'failed' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 text-rose-455 border border-rose-500/20 text-xs font-semibold" title={dbError || ''}>
                <AlertTriangle size={13} className="text-rose-400 animate-pulse" />
                <span>Connection Failed</span>
              </div>
            )}
            {dbStatus === 'local' && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                <AlertTriangle size={13} />
                <span>Local Mock Mode</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Warning/Info alert if offline / not configured */}
      {dbStatus === 'local' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between"
        >
          <div className="flex gap-3 items-start sm:items-center">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 flex-shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h5 className="text-sm font-semibold text-zinc-200">Supabase Connection Required</h5>
              <p className="text-xs text-zinc-450 mt-0.5 leading-relaxed">
                App is currently running in local mode. Setup your <code className="text-amber-400 font-mono">.env.local</code> variables to link with Supabase.
              </p>
            </div>
          </div>
          <div className="flex gap-2 self-stretch sm:self-center">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-zinc-900 border border-zinc-800 text-zinc-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <FileCode size={11} />
              Read supabase-schema.sql
            </span>
          </div>
        </motion.div>
      )}

      {/* Warning alert if connection failed */}
      {dbStatus === 'failed' && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex flex-col sm:flex-row gap-3 items-start sm:items-start justify-between"
        >
          <div className="flex gap-3 items-start sm:items-start">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 flex-shrink-0 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div className="space-y-2">
              <div>
                <h5 className="text-sm font-semibold text-zinc-200">Supabase Connection Failed</h5>
                <p className="text-xs text-zinc-450 mt-0.5 leading-relaxed">
                  App fell back to local offline mode. Error message:
                </p>
              </div>
              <div className="text-[11px] text-rose-400 leading-relaxed font-mono bg-zinc-950/65 p-3 rounded-xl border border-zinc-900 overflow-x-auto max-w-full">
                {dbError}
              </div>
              <p className="text-xs text-zinc-450 leading-relaxed">
                {dbError?.toLowerCase().includes('relation') || dbError?.toLowerCase().includes('tasks') ? (
                  <span>
                    👉 <strong>Missing Table:</strong> The <code className="text-indigo-400 font-mono">tasks</code> table might be missing in your Supabase database. Please copy the SQL from <code className="text-indigo-400 font-mono">supabase-schema.sql</code> and execute it in your <strong>Supabase SQL Editor</strong>.
                  </span>
                ) : dbError?.toLowerCase().includes('api key') || dbError?.toLowerCase().includes('jwt') || dbError?.toLowerCase().includes('anon') ? (
                  <span>
                    👉 <strong>Invalid API Key:</strong> Your <code className="text-indigo-400 font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> appears to be invalid or expired. Check your API keys under Settings &gt; API in the Supabase Dashboard.
                  </span>
                ) : (
                  <span>
                    👉 Please check your internet connection, verify your database URL and Anon key in your <code className="text-indigo-400 font-mono">.env.local</code> file, and restart the development server.
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 self-stretch sm:self-center items-center mt-3 sm:mt-0 flex-shrink-0">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-zinc-900 border border-zinc-800 text-zinc-450 px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap">
              Offline Fallback Active
            </span>
          </div>
        </motion.div>
      )}      {currentView === 'board' ? (
        <>
          {/* Stats Widget */}
          <TaskStats tasks={tasks} />

          {/* Main Grid Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-grow">
            {/* Left Side: Create Task Card */}
            <div className="lg:col-span-3 sticky top-6">
              <div className="glass rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 text-zinc-800 pointer-events-none">
                  <Sparkles size={40} className="opacity-10" />
                </div>
                <h2 className="text-lg font-bold text-white mb-1.5">Create New Task</h2>
                <p className="text-xs text-zinc-400 mb-5">Draft a new item and track your milestones.</p>
                <TaskForm onSubmit={handleAddTask} isSubmitting={submitting} />
              </div>
            </div>

            {/* Right Side: Task Board & List */}
            <div className="lg:col-span-9 space-y-6">
              {/* Controls Bar */}
              <div className="glass rounded-2xl p-4 flex flex-col gap-4">
                {/* Search and Toggle Filter Button */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-grow relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-zinc-900/60 border border-zinc-800/80 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    />
                    {search && (
                      <button 
                        onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  {/* Quick Filters */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center overflow-x-auto max-w-full">
                    <SlidersHorizontal size={14} className="text-zinc-500 mr-1.5 flex-shrink-0" />
                    <div className="bg-zinc-950/80 border border-zinc-850 p-1 rounded-xl flex gap-1 flex-shrink-0">
                      {(['all', 'pending', 'completed'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg capitalize cursor-pointer transition-all ${
                            statusFilter === status
                              ? 'bg-zinc-800 text-white shadow-sm'
                              : 'text-zinc-450 hover:text-zinc-200'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sub-Filters: Priority and Sorting */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-900">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-500">Priorities:</span>
                    <div className="flex bg-zinc-950/80 border border-zinc-850 p-1 rounded-xl gap-1">
                      {(['low', 'medium', 'high'] as Priority[]).map((p) => {
                        const isActive = priorityFilter.includes(p);
                        let activeStyles = '';
                        if (p === 'low') {
                          activeStyles = isActive 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-sm shadow-emerald-500/5' 
                            : 'text-zinc-550 border-transparent hover:text-zinc-300';
                        } else if (p === 'medium') {
                          activeStyles = isActive 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-sm shadow-amber-500/5' 
                            : 'text-zinc-550 border-transparent hover:text-zinc-300';
                        } else {
                          activeStyles = isActive 
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/25 shadow-sm shadow-rose-500/5' 
                            : 'text-zinc-550 border-transparent hover:text-rose-350';
                        }

                        return (
                          <button
                            key={p}
                            onClick={() => togglePriorityFilter(p)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer transition-all capitalize ${activeStyles}`}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 bg-zinc-950/40 border border-zinc-850/50 px-3 py-1 rounded-lg">
                    <span>Sorted: Priority &gt; Due Date</span>
                  </div>
                </div>
              </div>

              {/* Tasks Board Partitions */}
              <div>
                {loading ? (
                  <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center text-zinc-450 gap-3">
                    <Loader2 className="animate-spin text-indigo-500" size={30} />
                    <span className="text-sm font-semibold tracking-wide">Loading tasks database...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                    {/* Column 1: Overdue Tasks */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-rose-500/10 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                          <h4 className="text-sm font-bold text-rose-450 uppercase tracking-wider">Overdue Tasks</h4>
                        </div>
                        <span className="text-xs bg-rose-500/10 text-rose-450 border border-rose-500/20 px-2.5 py-0.5 rounded-full font-bold">
                          {overdueTasks.length}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {overdueTasks.length > 0 ? (
                          <motion.div layout className="space-y-3">
                            <AnimatePresence mode="popLayout">
                              {overdueTasks.map((task) => (
                                <TaskCard
                                  key={task.id}
                                  task={task}
                                  onToggleComplete={handleToggleComplete}
                                  onEdit={setEditingTask}
                                  onDelete={handleDeleteTask}
                                />
                              ))}
                            </AnimatePresence>
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="glass-light rounded-2xl p-6 text-center border-dashed border-zinc-800/60"
                          >
                            <h5 className="text-xs font-bold text-zinc-450">No Overdue Tasks</h5>
                            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                              All caught up or due dates are clear!
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Column 2: Remaining Tasks */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-indigo-500" />
                          <h4 className="text-sm font-bold text-zinc-350 uppercase tracking-wider">Remaining Tasks</h4>
                        </div>
                        <span className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded-full font-bold">
                          {remainingTasks.length}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {remainingTasks.length > 0 ? (
                          <motion.div layout className="space-y-3">
                            <AnimatePresence mode="popLayout">
                              {remainingTasks.map((task) => (
                                <TaskCard
                                  key={task.id}
                                  task={task}
                                  onToggleComplete={handleToggleComplete}
                                  onEdit={setEditingTask}
                                  onDelete={handleDeleteTask}
                                />
                              ))}
                            </AnimatePresence>
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="glass-light rounded-2xl p-6 text-center border-dashed border-zinc-800/60"
                          >
                            <h5 className="text-xs font-bold text-zinc-450">No Active Tasks</h5>
                            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                              Draft some active items using the entry panel.
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Column 3: Completed Tasks */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <h4 className="text-sm font-bold text-emerald-450 uppercase tracking-wider">Completed</h4>
                        </div>
                        <span className="text-xs bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                          {completedTasks.length}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {completedTasks.length > 0 ? (
                          <motion.div layout className="space-y-3">
                            <AnimatePresence mode="popLayout">
                              {completedTasks.map((task) => (
                                <TaskCard
                                  key={task.id}
                                  task={task}
                                  onToggleComplete={handleToggleComplete}
                                  onEdit={setEditingTask}
                                  onDelete={handleDeleteTask}
                                />
                              ))}
                            </AnimatePresence>
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="glass-light rounded-2xl p-6 text-center border-dashed border-zinc-800/60"
                          >
                            <h5 className="text-xs font-bold text-zinc-450">No Completed Tasks</h5>
                            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                              Mark a task as complete to see it here!
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-grow space-y-8"
        >
          {/* User Analysis Section */}
          <div className="glass rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 text-zinc-850 pointer-events-none">
              <PieChart size={75} className="opacity-5 stroke-[1.25]" />
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="text-indigo-400" size={20} />
              User Productivity &amp; Due Date Analysis
            </h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Understand task completion metrics and time management. This graph analyzes completed tasks with deadlines to see if they were finished before or after their due dates.
            </p>
          </div>          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Side: Pie Chart + Tamas Score */}
            <div className="lg:col-span-5 space-y-6">
              {/* Pie Chart Card */}
              <div className="glass rounded-3xl p-6 flex flex-col items-center justify-center min-h-[365px] relative">
                <h3 className="text-sm font-bold text-zinc-350 tracking-wider uppercase mb-8 self-start">Task Discipline Ratio</h3>
                
                {(() => {
                  const tasksWithDeadline = tasks.filter((t) => t.due_date);
                  const totalTasks = tasksWithDeadline.length;

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  // 1. Completed before/on time (green)
                  const onTimeCompleted = tasksWithDeadline.filter(t => {
                    if (!t.is_completed || !t.due_date) return false;
                    const due = new Date(t.due_date);
                    due.setHours(0, 0, 0, 0);
                    const completed = t.completed_at ? new Date(t.completed_at) : new Date();
                    completed.setHours(0, 0, 0, 0);
                    return completed <= due;
                  });

                  // 2. Remaining future task (yellow)
                  const futureIncomplete = tasksWithDeadline.filter(t => {
                    if (t.is_completed || !t.due_date) return false;
                    const due = new Date(t.due_date);
                    due.setHours(0, 0, 0, 0);
                    return due >= today;
                  });

                  // 3. Completed overdue (orange)
                  const overdueCompleted = tasksWithDeadline.filter(t => {
                    if (!t.is_completed || !t.due_date) return false;
                    const due = new Date(t.due_date);
                    due.setHours(0, 0, 0, 0);
                    const completed = t.completed_at ? new Date(t.completed_at) : new Date();
                    completed.setHours(0, 0, 0, 0);
                    return completed > due;
                  });

                  // 4. Incomplete overdue (red)
                  const overdueIncomplete = tasksWithDeadline.filter(t => {
                    if (t.is_completed || !t.due_date) return false;
                    const due = new Date(t.due_date);
                    due.setHours(0, 0, 0, 0);
                    return due < today;
                  });

                  const onTimeCount = onTimeCompleted.length;
                  const futureCount = futureIncomplete.length;
                  const overdueCompletedCount = overdueCompleted.length;
                  const overdueIncompleteCount = overdueIncomplete.length;

                  const onTimePercent = totalTasks > 0 ? Math.round((onTimeCount / totalTasks) * 100) : 0;
                  const futurePercent = totalTasks > 0 ? Math.round((futureCount / totalTasks) * 100) : 0;
                  const overdueCompletedPercent = totalTasks > 0 ? Math.round((overdueCompletedCount / totalTasks) * 100) : 0;
                  const overdueIncompletePercent = totalTasks > 0 ? Math.round((overdueIncompleteCount / totalTasks) * 100) : 0;

                  // Float values for SVG chart sectors to avoid rounding visual gaps
                  const onTimeVal = totalTasks > 0 ? (onTimeCount / totalTasks) * 100 : 0;
                  const futureVal = totalTasks > 0 ? (futureCount / totalTasks) * 100 : 0;
                  const overdueCompletedVal = totalTasks > 0 ? (overdueCompletedCount / totalTasks) * 100 : 0;
                  const overdueIncompleteVal = totalTasks > 0 ? (overdueIncompleteCount / totalTasks) * 100 : 0;

                  if (totalTasks > 0) {
                    return (
                      <div className="flex flex-col items-center gap-6 w-full">
                        {/* SVG Donut Chart wrapper */}
                        <div className="relative h-48 w-48 flex items-center justify-center">
                          <svg width="180" height="180" viewBox="0 0 40 40" className="transform -rotate-90">
                            {/* Base circle background */}
                            <circle cx="20" cy="20" r="15.9155" fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="4.5" />
                            
                            {/* 1. Green segment (Completed on time) */}
                            {onTimeCount > 0 && (
                              <circle
                                cx="20"
                                cy="20"
                                r="15.9155"
                                fill="transparent"
                                stroke="#10b981"
                                strokeWidth="4.5"
                                strokeDasharray={`${onTimeVal} ${100 - onTimeVal}`}
                                strokeDashoffset="0"
                                className="transition-all duration-500 stroke-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.1)]"
                              />
                            )}
                            
                            {/* 2. Yellow segment (Remaining future tasks) */}
                            {futureCount > 0 && (
                              <circle
                                cx="20"
                                cy="20"
                                r="15.9155"
                                fill="transparent"
                                stroke="#eab308"
                                strokeWidth="4.5"
                                strokeDasharray={`${futureVal} ${100 - futureVal}`}
                                strokeDashoffset={`-${onTimeVal}`}
                                className="transition-all duration-500 stroke-yellow-400 drop-shadow-[0_0_6px_rgba(234,179,8,0.1)]"
                              />
                            )}
                            
                            {/* 3. Orange segment (Completed overdue) */}
                            {overdueCompletedCount > 0 && (
                              <circle
                                cx="20"
                                cy="20"
                                r="15.9155"
                                fill="transparent"
                                stroke="#f97316"
                                strokeWidth="4.5"
                                strokeDasharray={`${overdueCompletedVal} ${100 - overdueCompletedVal}`}
                                strokeDashoffset={`-${onTimeVal + futureVal}`}
                                className="transition-all duration-500 stroke-orange-500 drop-shadow-[0_0_6px_rgba(249,115,22,0.1)]"
                              />
                            )}
                            
                            {/* 4. Red segment (Incomplete overdue) */}
                            {overdueIncompleteCount > 0 && (
                              <circle
                                cx="20"
                                cy="20"
                                r="15.9155"
                                fill="transparent"
                                stroke="#f43f5e"
                                strokeWidth="4.5"
                                strokeDasharray={`${overdueIncompleteVal} ${100 - overdueIncompleteVal}`}
                                strokeDashoffset={`-${onTimeVal + futureVal + overdueCompletedVal}`}
                                className="transition-all duration-500 stroke-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.1)]"
                              />
                            )}
                          </svg>
                          {/* Inner Label */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-3xl font-extrabold text-white tracking-tight">{totalTasks}</span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">Deadlines</span>
                          </div>
                        </div>

                        {/* Legends */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 justify-center w-full max-w-sm px-2">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-emerald-500 flex-shrink-0" />
                            <div>
                              <p className="text-[11px] font-bold text-zinc-350 leading-tight">Completed On-Time</p>
                              <p className="text-[10px] text-zinc-500 font-semibold">{onTimeCount} tasks ({onTimePercent}%)</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-yellow-400 flex-shrink-0" />
                            <div>
                              <p className="text-[11px] font-bold text-zinc-355 leading-tight">Remaining Future</p>
                              <p className="text-[10px] text-zinc-500 font-semibold">{futureCount} tasks ({futurePercent}%)</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-orange-500 flex-shrink-0" />
                            <div>
                              <p className="text-[11px] font-bold text-zinc-350 leading-tight">Completed Late</p>
                              <p className="text-[10px] text-zinc-500 font-semibold">{overdueCompletedCount} tasks ({overdueCompletedPercent}%)</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full bg-rose-500 flex-shrink-0" />
                            <div>
                              <p className="text-[11px] font-bold text-zinc-355 leading-tight">Overdue Pending</p>
                              <p className="text-[10px] text-zinc-500 font-semibold">{overdueIncompleteCount} tasks ({overdueIncompletePercent}%)</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col items-center justify-center text-center py-8">
                      <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-550 flex items-center justify-center mb-3">
                        <BarChart3 size={20} />
                      </div>
                      <h4 className="text-xs font-bold text-zinc-450">No Deadline Task Data</h4>
                      <p className="text-[10px] text-zinc-600 mt-1 max-w-[200px] leading-relaxed">
                        Add tasks with due dates to view your deadline breakdown chart.
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Tamas Score Card */}
              <div className="glass rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 text-zinc-850 pointer-events-none">
                  <Award size={75} className="opacity-5 stroke-[1.25]" />
                </div>
                <h3 className="text-sm font-bold text-zinc-350 tracking-wider uppercase mb-4">Tamas Score</h3>
                      {(() => {
                  const tasksWithDeadline = tasks.filter(t => t.due_date);
                  
                  // Active tasks are completed tasks OR incomplete overdue tasks
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const activeTasks = tasksWithDeadline.filter(t => {
                    if (t.is_completed) return true;
                    if (t.due_date) {
                      const due = new Date(t.due_date);
                      due.setHours(0, 0, 0, 0);
                      return today > due; // Only count incomplete if it is overdue
                    }
                    return false;
                  });
                  
                  if (activeTasks.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <div className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-850 text-zinc-550 flex items-center justify-center mx-auto mb-3">
                          <Award size={18} />
                        </div>
                        <h4 className="text-xs font-bold text-zinc-450">No Performance Data</h4>
                        <p className="text-[10px] text-zinc-600 mt-1 max-w-[220px] mx-auto leading-relaxed">
                          Tamas Score is computed from completed tasks or overdue incomplete tasks. Add some completions or overdue tasks to calculate.
                        </p>
                      </div>
                    );
                  }

                  let totalPoints = 0;
                  let completedPoints = 0;
                  let overduePoints = 0;
                  
                  let completedCount = 0;
                  let overdueCount = 0;

                  activeTasks.forEach(t => {
                    if (!t.due_date) return;
                    const due = new Date(t.due_date);
                    due.setHours(0, 0, 0, 0);
                    
                    const priorityWeights = { low: 1, medium: 2, high: 3 };
                    const pWeight = priorityWeights[t.priority] || 1;

                    if (t.is_completed) {
                      completedCount++;
                      const completedDate = t.completed_at ? new Date(t.completed_at) : new Date();
                      completedDate.setHours(0, 0, 0, 0);
                      const diffTime = completedDate.getTime() - due.getTime();
                      let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                      
                      // Cap reward at -14 days (2 weeks early) and penalty at +30 days (1 month late)
                      // to prevent massive outliers from breaking the score's active utility
                      diffDays = Math.max(-14, Math.min(30, diffDays));
                      
                      const contribution = diffDays * pWeight * 4;
                      totalPoints += contribution;
                      completedPoints += contribution;
                    } else {
                      overdueCount++;
                      const diffTime = today.getTime() - due.getTime();
                      let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                      
                      // Cap penalty at +30 days (1 month late)
                      diffDays = Math.min(30, diffDays);
                      
                      const contribution = diffDays * pWeight * 5;
                      totalPoints += contribution;
                      overduePoints += contribution;
                    }
                  });

                  // Normalize by dividing by the number of active tasks to prevent task-volume bias
                  const normalizedScore = Math.round((totalPoints / activeTasks.length) * 10) / 10;

                  let scoreColor = 'text-indigo-400';
                  let scoreBg = 'from-indigo-500/10 to-purple-500/5 border-indigo-500/10';
                  let scoreStatus = 'Neutral';
                  
                  if (normalizedScore < 0) {
                    scoreColor = 'text-emerald-400';
                    scoreBg = 'from-emerald-500/10 to-teal-500/5 border-emerald-500/15';
                    scoreStatus = 'Highly Proactive';
                  } else if (normalizedScore > 0) {
                    scoreColor = 'text-rose-400';
                    scoreBg = 'from-rose-500/10 to-amber-500/5 border-rose-500/15';
                    scoreStatus = 'Lagging Backlog';
                  }

                  return (
                    <div className="space-y-4">
                      {/* Main Score Badge */}
                      <div className={`p-5 rounded-2xl bg-gradient-to-br ${scoreBg} border flex items-center justify-between`}>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">Productivity Status</span>
                          <h4 className={`text-base font-extrabold ${scoreColor}`}>{scoreStatus}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase block">Index Score</span>
                          <span className={`text-3xl font-black ${scoreColor} tracking-tight`}>
                            {normalizedScore > 0 ? `+${normalizedScore}` : normalizedScore}
                          </span>
                        </div>
                      </div>

                      {/* Score Component Breakdown */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-900 flex flex-col justify-between">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Completed Tasks ({completedCount})</span>
                          <span className={`text-sm font-extrabold mt-1.5 ${completedPoints <= 0 ? 'text-emerald-400' : 'text-rose-455'}`}>
                            {completedPoints > 0 ? `+${completedPoints}` : completedPoints} pts
                          </span>
                          <span className="text-[9px] text-zinc-550 mt-0.5">x4 completed multiplier</span>
                        </div>
                        <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-900 flex flex-col justify-between">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Overdue Incomplete ({overdueCount})</span>
                          <span className={`text-sm font-extrabold mt-1.5 ${overduePoints <= 0 ? 'text-emerald-400' : 'text-rose-455'}`}>
                            {overduePoints > 0 ? `+${overduePoints}` : overduePoints} pts
                          </span>
                          <span className="text-[9px] text-zinc-550 mt-0.5">x5 overdue multiplier</span>
                        </div>
                      </div>

                      {/* AI Productivity Review Panel */}
                      {(() => {
                        const getReviewMessage = (score: number) => {
                          if (score <= -50) {
                            return {
                              title: "Speed Master ⚡",
                              desc: "You are absolutely crushing it with top-tier efficiency and focus! Keep harnessing this incredible momentum to achieve your biggest goals and maintain your lead.",
                              color: "text-emerald-400 border-emerald-500/10 bg-emerald-500/5",
                              bulletColor: "bg-emerald-400",
                              fixes: null
                            };
                          } else if (score > -50 && score <= -10) {
                            return {
                              title: "Highly Productive 🚀",
                              desc: "Your work ethic is stellar, and you are consistently making great strides forward. Keep this fantastic energy up and continue growing your skills at this impressive pace!",
                              color: "text-teal-400 border-teal-500/10 bg-teal-500/5",
                              bulletColor: "bg-teal-400",
                              fixes: null
                            };
                          } else if (score > -10 && score <= 5) {
                            return {
                              title: "Steady Punctuality 🎯",
                              desc: "You have built a solid, reliable routine that keeps you perfectly on track. Stay consistent, trust your process, and you will easily maintain this healthy, stress-free balance.",
                              color: "text-indigo-400 border-indigo-500/10 bg-indigo-500/5",
                              bulletColor: "bg-indigo-400",
                              fixes: null
                            };
                          } else if (score > 5 && score <= 25) {
                            return {
                              title: "Slight Delay Alert ⚠️",
                              desc: "Procrastination is starting to creep in, but it is not too late to catch up. Shake off the distractions, kill the incoming laziness, and refocus your energy before things begin to pile up.",
                              color: "text-amber-400 border-amber-500/10 bg-amber-500/5",
                              bulletColor: "bg-amber-400",
                              fixes: null
                            };
                          } else if (score > 25 && score <= 75) {
                            return {
                              title: "Heavy Backlog Pressure 📉",
                              desc: "Laziness is taking a toll, and the mounting pressure is a clear sign to improve your lifestyle and daily habits. It is time to break the cycle of delay and reclaim your time!",
                              fixes: [
                                "The 5-Minute Rule: Commit to working on a delayed task for just five minutes. Be generous with yourself—if you want to stop after five minutes, you can, but usually, the friction vanishes once you just start.",
                                "Prioritize Ruthlessly: Pick just one high-impact task to complete today. Getting one major thing done will instantly relieve the heaviest part of your backlog and boost your morale."
                              ],
                              color: "text-orange-400 border-orange-500/10 bg-orange-500/5",
                              bulletColor: "bg-orange-400"
                            };
                          } else {
                            return {
                              title: "Critical Overdue 🚨",
                              desc: "You have hit a wall of deep procrastination that needs to be killed right now before it completely derails your progress. Be kind to yourself over past mistakes, but take immediate, decisive action to turn your lifestyle around!",
                              fixes: [
                                "Declare a Clean Slate: Forgive yourself for the overdue work. Brain-dump everything on paper, isolate the absolute top 2 critical items, and ignore the rest until you regain your footing.",
                                "Reset Your Physical Baseline: Severe laziness is often disguised burnout. Step away from your desk, fix your sleep schedule, drink some water, and go for a walk—rebuilding your physical energy is the first step to beating it."
                              ],
                              color: "text-rose-400 border-rose-500/10 bg-rose-500/5",
                              bulletColor: "bg-rose-400"
                            };
                          }
                        };

                        const review = getReviewMessage(normalizedScore);

                        return (
                          <div className={`p-4 rounded-2xl border ${review.color} space-y-3`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">AI Productivity Review</span>
                              <span className="text-[11px] font-bold">{review.title}</span>
                            </div>
                            <p className="text-[11px] opacity-80 leading-relaxed">{review.desc}</p>
                            
                            {review.fixes && review.fixes.length > 0 && (
                              <div className="pt-2.5 border-t border-white/5 space-y-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-65 block">Recommended Action Checklist:</span>
                                <div className="space-y-2">
                                  {review.fixes.map((fix, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-[10.5px] opacity-85 leading-normal">
                                      <span className={`h-1.5 w-1.5 rounded-full ${review.bulletColor} mt-1.5 flex-shrink-0`} />
                                      <span>{fix}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      
                      {/* Toggle button */}
                      <button
                        type="button"
                        onClick={() => setShowTamasCalc(!showTamasCalc)}
                        className="w-full text-left text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-950/40 hover:bg-zinc-900/60 border border-zinc-900/80 px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer"
                      >
                        <span>{showTamasCalc ? 'Hide Calculation Details' : 'Show Calculation Details'}</span>
                        <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md font-mono">
                          {showTamasCalc ? '▲ Close' : '▼ View'}
                        </span>
                      </button>

                      {/* Collapsible calculation box */}
                      <AnimatePresence>
                        {showTamasCalc && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="text-[11px] text-zinc-450 leading-relaxed bg-zinc-950/40 border border-zinc-900/85 rounded-xl p-4 space-y-3">
                              <div>
                                <p className="font-bold text-zinc-200 mb-1 text-xs">How Tamas Score works</p>
                                <p className="text-[10px] text-zinc-500 leading-normal">
                                  Tamas Score measures your productivity and schedule discipline. It evaluates completed tasks and active overdue tasks. Future incomplete tasks are excluded to prevent diluting your real score.
                                </p>
                              </div>

                              <div className="space-y-1.5 border-t border-zinc-900/80 pt-2.5">
                                <p className="font-semibold text-zinc-300 text-[10px] uppercase tracking-wider">1. Priority Weights</p>
                                <ul className="list-disc pl-4 space-y-0.5 font-mono text-zinc-500 text-[10px]">
                                  <li>Low Priority = <span className="text-zinc-400">1</span></li>
                                  <li>Medium Priority = <span className="text-zinc-400">2</span></li>
                                  <li>High Priority = <span className="text-zinc-400">3</span></li>
                                </ul>
                              </div>

                              <div className="space-y-1.5 border-t border-zinc-900/80 pt-2.5">
                                <p className="font-semibold text-zinc-300 text-[10px] uppercase tracking-wider">2. Task Types &amp; Caps</p>
                                <ul className="list-decimal pl-4 space-y-2.5 text-zinc-500 text-[10px]">
                                  <li>
                                    <strong>Completed Tasks (x4 Weight):</strong>
                                    <p className="text-zinc-500 leading-normal mt-0.5">
                                      Formula: <code className="text-indigo-400 font-mono">Days Late/Early * Priority * 4</code>. Early completions subtract points (good), late ones add points (bad). Early rewards are capped at -14 days and late penalties at +30 days to avoid outlier skews.
                                    </p>
                                  </li>
                                  <li>
                                    <strong>Overdue Incomplete Tasks (x5 Weight):</strong>
                                    <p className="text-zinc-500 leading-normal mt-0.5">
                                      Formula: <code className="text-rose-455 font-mono">Days Overdue * Priority * 5</code>. Every day they remain overdue adds heavy penalties (capped at 30 days maximum).
                                    </p>
                                  </li>
                                  <li>
                                    <strong>Future Incomplete Tasks (x0 Weight):</strong>
                                    <p className="text-zinc-500 leading-normal mt-0.5">
                                      Excluded from math and task divisor to prevent dilution and gaming.
                                    </p>
                                  </li>
                                </ul>
                              </div>

                              <div className="space-y-1.5 border-t border-zinc-900/80 pt-2.5">
                                <p className="font-semibold text-zinc-300 text-[10px] uppercase tracking-wider">3. Normalization</p>
                                <p className="text-[10px] text-zinc-550 leading-normal">
                                  The sum of all points is divided by the number of active tasks (<code className="text-zinc-400">Completed + Overdue Incomplete</code>). This gives an average index independent of task volume. Lower is better: negative scores represent proactiveness.
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })()}
              </div>
            </div>
            
            {/* List breakdown of completed tasks */}
            <div className="lg:col-span-7 glass rounded-3xl p-6 flex flex-col gap-6">
              <h3 className="text-sm font-bold text-zinc-350 tracking-wider uppercase">Completed Task Breakdown</h3>
              
              {(() => {
                const completedTasksList = tasks.filter((t) => t.is_completed);
                const totalCompleted = completedTasksList.length;

                const isCompletedLate = (task: Task) => {
                  if (!task.due_date || !task.completed_at) return false;
                  const due = new Date(task.due_date);
                  due.setHours(0, 0, 0, 0);
                  const completed = new Date(task.completed_at);
                  completed.setHours(0, 0, 0, 0);
                  return completed > due;
                };

                const lateCompletedTasks = completedTasksList.filter(isCompletedLate);
                const onTimeCompletedTasks = completedTasksList.filter((t) => !isCompletedLate(t));

                const lateCount = lateCompletedTasks.length;
                const onTimeCount = onTimeCompletedTasks.length;

                const getDaysLate = (task: Task) => {
                  if (!task.due_date || !task.completed_at) return 0;
                  const due = new Date(task.due_date);
                  due.setHours(0, 0, 0, 0);
                  const comp = new Date(task.completed_at);
                  comp.setHours(0, 0, 0, 0);
                  const diffTime = comp.getTime() - due.getTime();
                  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                };

                if (totalCompleted === 0) {
                  return (
                    <div className="flex-grow flex items-center justify-center text-center p-8">
                      <p className="text-xs text-zinc-550 italic">No tasks completed yet. Complete some tasks on the board to view metrics here.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* On-Time column */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Completed On-Time ({onTimeCount})</h4>
                      </div>
                      
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {onTimeCompletedTasks.length > 0 ? (
                          onTimeCompletedTasks.map((t) => (
                            <div key={t.id} className="p-3 rounded-xl bg-zinc-950/20 border border-zinc-900/60 flex items-start gap-2.5">
                              <CheckSquare className="text-emerald-500 flex-shrink-0 mt-0.5" size={13} />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-zinc-300 truncate">{t.title}</p>
                                {t.due_date ? (
                                  <p className="text-[10px] text-zinc-550 mt-0.5">
                                    Due: {new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-zinc-550 mt-0.5">No deadline</p>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-zinc-600 italic py-2">No tasks in this list.</p>
                        )}
                      </div>
                    </div>

                    {/* Overdue/Late column */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-rose-500/10 pb-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        <h4 className="text-xs font-bold text-rose-450 uppercase tracking-wider">Completed Late ({lateCount})</h4>
                      </div>
                      
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {lateCompletedTasks.length > 0 ? (
                          lateCompletedTasks.map((t) => {
                            const daysLate = getDaysLate(t);
                            return (
                              <div key={t.id} className="p-3 rounded-xl bg-zinc-950/20 border border-zinc-900/60 flex items-start gap-2.5">
                                <AlertTriangle className="text-rose-500 flex-shrink-0 mt-0.5" size={13} />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-zinc-300 truncate">{t.title}</p>
                                  <p className="text-[10px] text-rose-450/85 font-bold mt-0.5 flex items-center gap-1">
                                    <span>Completed {daysLate} {daysLate === 1 ? 'day' : 'days'} late</span>
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-[11px] text-zinc-650 italic py-2">No tasks in this list.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </motion.div>
      )}

      {/* Edit Task Modal */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTask(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg glass bg-zinc-950 rounded-2xl p-6 shadow-2xl border border-zinc-800 z-10"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-900">
                <div>
                  <h3 className="text-lg font-bold text-white">Edit Task Details</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Modify parameters or notes for this task.</p>
                </div>
                <button
                  onClick={() => setEditingTask(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <TaskForm
                task={editingTask}
                onSubmit={handleEditSubmit}
                onCancel={() => setEditingTask(null)}
                isSubmitting={submitting}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto pt-16 pb-4 border-t border-zinc-900 text-center text-xs text-zinc-650 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p>© 2026 ApexTask. Designed with Next.js & Supabase.</p>
        <div className="flex gap-4">
          <span className="text-zinc-500">Tailwind v4.0</span>
          <span className="text-zinc-500">TypeScript</span>
        </div>
      </footer>
    </div>
  );
}
