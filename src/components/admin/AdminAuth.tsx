import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings2 } from 'lucide-react';

interface AdminAuthProps {
  onLogin: () => void;
}

export function AdminAuth({ onLogin }: AdminAuthProps) {
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      onLogin();
    } else {
      alert('Invalid Password');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-amber-50 p-10 rounded-2xl border border-amber-200 shadow-2xl shadow-indigo-100 max-w-md w-full text-center"
      >
        <div className="h-16 w-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <Settings2 className="h-8 w-8 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Central Ops</h1>
        <p className="text-slate-500 mb-10 text-sm font-medium uppercase tracking-widest">Administrative Auth Required</p>
        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="password"
            placeholder="System Passkey"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 text-center font-bold tracking-[0.2em]"
          />
          <button className="w-full bg-slate-900 text-white rounded-2xl py-4 font-bold hover:bg-black transition-all shadow-lg active:scale-95">
            Access Dashboard
          </button>
        </form>
      </motion.div>
    </div>
  );
}
