import React from 'react';
import { Task } from '@/types/task';
import { CheckCircle2, Clock, AlertTriangle, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface TaskStatsProps {
  tasks: Task[];
}

export default function TaskStats({ tasks }: TaskStatsProps) {
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
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((stat, idx) => (
        <motion.div
          key={stat.title}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: idx * 0.1 }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className={`glass rounded-2xl p-5 relative overflow-hidden transition-all duration-300 ${stat.border}`}
        >
          {/* Subtle colorful glow inside card */}
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.bg} pointer-events-none`} />

          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-medium text-zinc-400 tracking-wider uppercase">{stat.title}</p>
              <h4 className="text-3xl font-bold text-white mt-2 tracking-tight">
                {stat.value}
              </h4>
              <p className="text-xs text-zinc-500 mt-1 font-medium">{stat.description}</p>
            </div>
            <div className={`p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 ${stat.color} shadow-lg`}>
              <stat.icon size={22} className="stroke-[1.75]" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
