
import React from 'react';
import { Link } from 'react-router-dom';
import { Vote, Shield, LogOut } from 'lucide-react';
import { Voter } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  voter: Voter | null;
  onLogout: () => void;
}

export function Layout({ children, voter, onLogout }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm shadow-indigo-200">
              <Vote className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">SecureVote</span>
          </Link>
          
          <nav className="flex items-center gap-6">
            {voter && (
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex flex-col items-end leading-tight">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Authenticated Voter</span>
                  <span className="text-sm font-semibold text-slate-700">{voter.name}</span>
                </div>
                <button 
                  onClick={onLogout}
                  className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-4 py-2 rounded-full hover:bg-red-50 hover:text-red-600 transition-all border border-slate-200"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            )}
            <Link 
              to="/admin" 
              className="group flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-200"
            >
              <Shield className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500 group-hover:text-indigo-600">Admin</span>
            </Link>
          </nav>
        </div>
      </header>
      
<main className="pt-20 pb-12">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <footer className="py-12 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500">
            <div className="flex flex-col items-center md:items-start">
               <div className="flex items-center gap-2 mb-2">
                 <Vote className="h-4 w-4 text-indigo-600" />
                 <span className="font-bold text-slate-900">SecureVote</span>
               </div>
               <p className="text-xs text-slate-400">© 2026 SecureVote Election Infrastructure. All Rights Reserved.</p>
            </div>
            <div className="flex gap-8 text-[11px] font-bold uppercase tracking-widest">
              <a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Terms</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Audit Report</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
