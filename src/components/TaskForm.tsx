import React, { useState, useEffect } from 'react';
import { Task, CreateTaskInput, Priority } from '@/types/task';
import { Calendar, AlertCircle, X } from 'lucide-react';

interface TaskFormProps {
  task?: Task | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export default function TaskForm({ task, onSubmit, onCancel, isSubmitting = false }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
    }
    setError('');
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: dueDate || null,
      };
      await onSubmit(payload);
      if (!task) {
        // Reset form for fresh tasks
        setTitle('');
        setDescription('');
        setPriority('medium');
        setDueDate('');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="text-sm font-semibold text-zinc-300">
          Task Title <span className="text-indigo-400">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Design app homepage mockups"
          className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
          maxLength={80}
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-semibold text-zinc-300">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details or subtasks..."
          rows={3}
          className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
        />
      </div>

      {/* Grid for Priority and Due Date */}
      <div className="grid grid-cols-1 gap-4">
        {/* Priority */}
        <div className="space-y-1.5">
          <span className="text-sm font-semibold text-zinc-300 block">Priority</span>
          <div className="flex gap-2">
            {(['low', 'medium', 'high'] as Priority[]).map((p) => {
              const isActive = priority === p;
              let btnClass = '';
              if (p === 'low') {
                btnClass = isActive 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                  : 'bg-zinc-900/40 text-zinc-400 border-zinc-800 hover:bg-zinc-800/50 hover:text-zinc-300';
              } else if (p === 'medium') {
                btnClass = isActive
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/60 shadow-lg shadow-amber-500/5'
                  : 'bg-zinc-900/40 text-zinc-400 border-zinc-800 hover:bg-zinc-800/50 hover:text-zinc-300';
              } else {
                btnClass = isActive
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/60 shadow-lg shadow-rose-500/5'
                  : 'bg-zinc-900/40 text-zinc-400 border-zinc-800 hover:bg-zinc-800/50 hover:text-rose-400/50';
              }

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`flex-1 border text-xs font-semibold py-2.5 px-3 rounded-xl capitalize transition-all duration-200 cursor-pointer ${btnClass}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Due Date */}
        <div className="space-y-1.5">
          <label htmlFor="dueDate" className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
            <Calendar size={15} className="text-zinc-400" />
            Due Date
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all [color-scheme:dark]"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-zinc-900 border border-zinc-850 text-zinc-350 hover:bg-zinc-850 hover:text-white rounded-xl py-3 text-sm font-semibold transition-all cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 text-sm font-semibold transition-all hover:shadow-lg hover:shadow-indigo-550/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting 
            ? 'Saving...' 
            : task 
              ? 'Update Task' 
              : 'Add Task'
          }
        </button>
      </div>
    </form>
  );
}
