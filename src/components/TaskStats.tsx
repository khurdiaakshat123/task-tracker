import React, { useState } from 'react';
import { Task } from '@/types/task';
import { CheckCircle2, Clock, AlertTriangle, Activity, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskStatsProps {
  tasks: Task[];
  tamasScore: number | null;
  onNavigateToAnalysis?: () => void;
}

export default function TaskStats({ tasks, tamasScore, onNavigateToAnalysis }: TaskStatsProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const total = tasks.length;
  const completed = tasks.filter((t) => t.is_completed).length;
  const pending = total - completed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const urgent = tasks.filter((t) => t.priority === 'high' && !t.is_completed).length;

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  const statCards = [
    {
      title: 'Total Tasks',
      value: total,
      description: 'Active backlog',
      icon: Activity,
      color: 'text-indigo-400',
      bg: 'from-indigo-500/10 to-indigo-500/0',
      border: 'hover:border-indigo-500/30',
    },
    {
      title: 'Completed',
      value: completed,
      description: `${completionRate}% completion rate`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'from-emerald-500/10 to-emerald-500/0',
      border: 'hover:border-emerald-500/30',
    },
    {
      title: 'Pending',
      value: pending,
      description: 'Tasks in progress',
      icon: Clock,
      color: 'text-amber-400',
      bg: 'from-amber-500/10 to-amber-500/0',
      border: 'hover:border-amber-500/30',
    },
    {
      title: 'Urgent Alert',
      value: urgent,
      description: 'High priority pending',
      icon: AlertTriangle,
      color: 'text-rose-400',
      bg: 'from-rose-500/10 to-rose-500/0',
      border: 'hover:border-rose-500/30',
    },
    {
      title: 'Tamas Score',
      value: tamasScore !== null ? (tamasScore > 0 ? `+${tamasScore}` : tamasScore) : 'N/A',
      description: 'Productivity index',
      icon: Award,
      color: 'text-purple-400',
      bg: 'from-purple-500/10 to-purple-500/0',
      border: 'hover:border-purple-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {statCards.map((stat, idx) => (
        <motion.div
          key={stat.title}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: idx * 0.1 }}
          whileHover={stat.title === 'Tamas Score' ? { y: -4, scale: 1.01 } : { y: -4 }}
          onClick={() => {
            if (stat.title === 'Tamas Score') {
              setShowTooltip(!showTooltip);
            }
          }}
          className={`glass rounded-2xl p-5 relative transition-all duration-300 ${stat.border} ${
            stat.title === 'Tamas Score' 
              ? 'cursor-pointer active:scale-[0.99] z-20' 
              : 'overflow-hidden'
          }`}
        >
          {/* Subtle colorful glow inside card */}
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} rounded-2xl pointer-events-none`} />

          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-medium text-zinc-400 tracking-wider uppercase">{stat.title}</p>
              <h4 className="text-2xl sm:text-3xl font-bold text-white mt-2 tracking-tight">
                {stat.value}
              </h4>
              <p className="text-xs text-zinc-500 mt-1 font-medium">{stat.description}</p>
            </div>
            <div className={`p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 ${stat.color} shadow-lg`}>
              <stat.icon size={22} className="stroke-[1.75]" />
            </div>
          </div>

          {stat.title === 'Tamas Score' && (
            <AnimatePresence>
              {showTooltip && (
                <>
                  {/* Invisible Backdrop to close tooltip */}
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTooltip(false);
                    }}
                  />
                  {/* Tooltip Content */}
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 glass bg-zinc-950 p-4 rounded-xl shadow-2xl border border-zinc-800 z-40 text-center"
                  >
                    <p className="text-xs text-zinc-300 font-semibold mb-3 leading-relaxed">
                      For more details, metrics breakdown, and productivity checklists, go to User Analysis.
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTooltip(false);
                        if (onNavigateToAnalysis) onNavigateToAnalysis();
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97] text-white text-[11px] font-bold py-2 rounded-lg cursor-pointer transition-all"
                    >
                      Go to User Analysis
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          )}
        </motion.div>
      ))}
    </div>
  );
}
