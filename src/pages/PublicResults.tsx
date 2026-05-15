import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Position, Candidate, Vote, Voter } from '../types';
import { ResultsDashboard } from '../components/admin/ResultsDashboard';
import { motion } from 'motion/react';
import { BarChart3, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PublicResults() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubPos = onSnapshot(query(collection(db, 'positions'), orderBy('order', 'asc')), (snap) => {
      setPositions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Position)));
    });

    const unsubCand = onSnapshot(collection(db, 'candidates'), (snap) => {
      setCandidates(snap.docs.map(d => ({ id: d.id, ...d.data() } as Candidate)));
    });

    const unsubVotes = onSnapshot(collection(db, 'votes'), (snap) => {
      setVotes(snap.docs.map(d => d.data() as Vote));
    });

    const unsubVoters = onSnapshot(collection(db, 'voters'), (snap) => {
      setVoters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Voter)));
      setLoading(false);
    });

    return () => {
      unsubPos();
      unsubCand();
      unsubVotes();
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
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-4">
            Tally Reports
            <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-200" />
          </h1>
        </div>
      </div>

      <ResultsDashboard positions={positions} candidates={candidates} votes={votes} voters={voters} />

      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] mt-24"
      >
        Verified Real-Time Reports • Secure Election Data
      </motion.p>
    </div>
  );
}
