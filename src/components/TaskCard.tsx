import React, { useState } from 'react';
import { Task } from '@/types/task';
import { Trash2, Edit2, Calendar, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string, isCompleted: boolean) => Promise<void>;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => Promise<void>;
}

export default function TaskCard({ task, onToggleComplete, onEdit, onDelete }: TaskCardProps) {
  const [showDesc, setShowDesc] = useState(false);
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  };

  const checkOverdue = (dateStr: string | null, isCompleted: boolean) => {
    if (!dateStr || isCompleted) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  const getCompletionStatus = () => {
    if (!task.is_completed || !task.due_date) return null;
    const due = new Date(task.due_date);
    due.setHours(0, 0, 0, 0);
    const completed = task.completed_at ? new Date(task.completed_at) : new Date();
    completed.setHours(0, 0, 0, 0);
    
    if (completed > due) {
      return {
        label: 'Overdue',
        classes: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
      };
    }
    return {
      label: 'On Time',
      classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    };
  };

  const overdue = checkOverdue(task.due_date, task.is_completed);

  const priorityColors = {
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    high: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={`glass rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 relative group overflow-hidden ${
        task.is_completed 
          ? 'opacity-60 border-zinc-900/50 bg-zinc-950/20' 
          : 'border-zinc-800 hover:border-zinc-700/60 shadow-lg shadow-black/10'
      }`}
    >
      {/* Checkbox Container */}
      <div className="flex-shrink-0 pt-0.5">
        <button
          onClick={() => onToggleComplete(task.id, !task.is_completed)}
          className={`h-6 w-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-200 ${
            task.is_completed
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'border-zinc-700 hover:border-indigo-500 bg-zinc-900/40'
          }`}
        >
          <AnimatePresence initial={false}>
            {task.is_completed && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', damping: 15 }}
              >
                <Check size={14} className="stroke-[3]" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Task Content */}
      <div className="flex-grow min-w-0 space-y-2">
        <div>
          <h3
            className={`font-semibold text-base leading-snug break-words transition-all duration-250 ${
              task.is_completed 
                ? 'line-through text-zinc-550' 
                : 'text-zinc-100 group-hover:text-white'
            }`}
          >
            {task.title}
          </h3>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-2 pt-1 items-center">
          {/* Priority */}
          <span
            className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border ${
              priorityColors[task.priority]
            }`}
          >
            {task.priority}
          </span>

          {/* Due date badge */}
          {task.due_date && (
            <span
              className={`text-[11px] font-medium px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                overdue
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : task.is_completed
                    ? 'bg-zinc-900/20 text-zinc-500 border-zinc-900'
                    : 'bg-zinc-900/50 text-zinc-400 border-zinc-800'
              }`}
            >
              {overdue ? <AlertCircle size={11} /> : <Calendar size={11} />}
              {formatDate(task.due_date)}
            </span>
          )}

          {/* Completion status tag (overdue or on/before time) */}
          {task.is_completed && task.due_date && (() => {
            const status = getCompletionStatus();
            if (!status) return null;
            return (
              <span
                className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border ${status.classes}`}
              >
                {status.label}
              </span>
            );
          })()}
        </div>

        {/* Collapsible description box */}
        {task.description && (
          <div className="mt-2.5">
            <button
              type="button"
              onClick={() => setShowDesc(!showDesc)}
              className="text-left text-xs font-semibold text-zinc-550 hover:text-zinc-350 bg-zinc-950/40 hover:bg-zinc-900 border border-zinc-850 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>{showDesc ? 'Hide Description' : 'Show Description'}</span>
            </button>
            {showDesc && (
              <p
                className={`text-sm mt-2.5 leading-relaxed break-words pl-2.5 border-l-2 border-zinc-850 ${
                  task.is_completed ? 'text-zinc-600' : 'text-zinc-400'
                }`}
              >
                {task.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-250">
        <button
          onClick={() => onEdit(task)}
          className="p-2 rounded-lg text-zinc-450 hover:text-indigo-400 hover:bg-zinc-800/40 cursor-pointer transition-colors"
          title="Edit Task"
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-2 rounded-lg text-zinc-450 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
          title="Delete Task"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  );
}
