import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Position, Voter } from '../types';
import { AnalyticsOverview } from '../components/admin/AnalyticsOverview';
import { motion } from 'motion/react';
import { BarChart3, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PublicAnalytics() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubPos = onSnapshot(query(collection(db, 'positions'), orderBy('order', 'asc')), (snap) => {
      setPositions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Position)));
    });

    const unsubVoters = onSnapshot(collection(db, 'voters'), (snap) => {
      setVoters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Voter)));
      setLoading(false);
    });

    return () => {
      unsubPos();
      unsubVoters();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-12">
        <div>
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-all mb-4 group"
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </button>
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight flex items-center gap-4">
            Live Election Insights
            <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-200" />
          </h1>
          <p className="text-slate-500 font-medium mt-2">Public view of real-time participation and system statistics.</p>
        </div>
        <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-indigo-200">
           <BarChart3 className="h-5 w-5" />
           <span className="text-sm font-bold uppercase tracking-widest">Public Feed</span>
        </div>
      </div>

      <AnalyticsOverview voters={voters} positions={positions} />

      {/* Public Disclaimer */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] mt-24"
      >
        Official Real-Time Voting Feed • Securely Synchronized
      </motion.p>
    </div>
  );
}
