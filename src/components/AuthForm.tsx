import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Lock, Mail, Sparkles, Loader2, Database, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthFormProps {
  onAuthSuccess: (user: { id: string; email: string }) => void;
}

export default function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSupabaseConfigured && supabase) {
        if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
            }
          });
          if (error) throw error;
          
          if (data.session) {
            onAuthSuccess(data.session.user as any);
          } else {
            setSuccessMsg('Registration successful! Please check your email inbox for confirmation.');
            setEmail('');
            setPassword('');
          }
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          if (data.session) {
            onAuthSuccess(data.session.user as any);
          }
        }
      } else {
        // Offline fall back mock mode login/signup
        const mockUserId = 'mock-user-' + email.trim().replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        const mockUser = {
          id: mockUserId,
          email: email.trim(),
        };
        
        // Save mock user session in local storage
        localStorage.setItem('task-tracker-mock-user', JSON.stringify(mockUser));
        
        // Short delay to simulate network latency
        await new Promise((resolve) => setTimeout(resolve, 800));
        onAuthSuccess(mockUser);
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setErrorMsg(err.message || 'An authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {/* Visual Header */}
      <div className="text-center mb-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 items-center justify-center shadow-lg shadow-indigo-500/20 mb-4"
        >
          <Lock className="text-white" size={22} />
        </motion.div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          {isSignUp ? 'Create your Account' : 'Welcome to ApexTask'}
        </h2>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          {isSignUp ? 'Sign up to lock in your private schedule.' : 'Sign in to access your secure developer workspace.'}
        </p>
      </div>

      {/* Main Glassmorphic Container */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="glass rounded-3xl p-6 relative overflow-hidden shadow-2xl border border-zinc-800/80"
      >
        {/* Sparkle Icon */}
        <div className="absolute top-0 right-0 p-6 text-zinc-800 pointer-events-none">
          <Sparkles size={35} className="opacity-10" />
        </div>

        {/* Database Mode Badge */}
        <div className="mb-6 flex justify-center">
          {isSupabaseConfigured ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database size={11} className="animate-pulse" />
              Secure Supabase Auth Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Placeholder variables configured in .env.local">
              <AlertCircle size={11} />
              Local Offline Simulation Mode
            </span>
          )}
        </div>

        {/* Auth Mode Tabs */}
        <div className="bg-zinc-950/80 border border-zinc-850 p-1 rounded-xl flex gap-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg cursor-pointer transition-all duration-200 ${
              !isSignUp ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-450 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg cursor-pointer transition-all duration-200 ${
              isSignUp ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-450 hover:text-zinc-200'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Email Address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@example.com"
                className="w-full bg-zinc-900/60 border border-zinc-800/80 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-900/60 border border-zinc-800/80 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          {/* Feedback messages */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-455 text-xs flex items-start gap-2"
              >
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-xs flex items-start gap-2"
              >
                <Database size={14} className="mt-0.5 flex-shrink-0 animate-pulse" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
