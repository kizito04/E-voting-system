
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Voter } from '../types';
import { motion } from 'motion/react';
import { UserCheck, AlertCircle, ArrowRight, Shield, BarChart3 } from 'lucide-react';
import { SeedUtility } from '../components/SeedUtility';

interface LandingPageProps {
  onLogin: (voter: Voter) => void;
  voter: Voter | null;
}

export function LandingPage({ onLogin, voter }: LandingPageProps) {
  const [voterName, setVoterName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGatekeeperAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedName = voterName.trim().toLowerCase();
    
    try {
      const votersRef = collection(db, 'voters');
      const q = query(votersRef, where('name_normalized', '==', trimmedName));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Name not found in register. Please check your spelling.');
        setLoading(false);
        return;
      }

      const voterDoc = querySnapshot.docs[0];
      const voterData = { id: voterDoc.id, ...voterDoc.data() } as Voter;

      if (voterData.status === 'Completed') {
        setError('You have already cast your vote.');
        setLoading(false);
        return;
      }

      const sessionId = crypto.randomUUID();
      await updateDoc(doc(db, 'voters', voterDoc.id), {
        status: 'In Progress',
        sessionId: sessionId
      });

      const updatedVoter: Voter = { ...voterData, status: 'In Progress', sessionId };
      onLogin(updatedVoter);
      navigate('/vote');
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'voters');
    } finally {
      setLoading(false);
    }
  };

  if (voter) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 max-w-md w-full"
        >
          <div className="h-20 w-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <UserCheck className="h-10 w-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3 text-balance">Welcome Back, {voter.name}</h1>
          <p className="text-sm font-medium text-slate-500 mb-10 uppercase tracking-widest">
            {voter.status === 'In Progress' 
              ? 'Active Session Detected' 
              : 'Status: Ballot Cast'}
          </p>
          {voter.status === 'In Progress' && (
            <button
              onClick={() => navigate('/vote')}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 group"
            >
              Continue to Vote
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center pt-4 pb-20">
      <div className="grid lg:grid-cols-2 gap-20 items-center max-w-6xl w-full">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="bg-indigo-100 inline-block px-4 py-1.5 rounded-full text-indigo-700 text-xs font-bold uppercase tracking-widest mb-6">
            E-Voting
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 leading-[1.1] mb-6">
            KISA KYU<br/>
          </h1>
          <div className="flex gap-4 items-center text-sm font-semibold text-slate-400">
             <div className="flex -space-x-3">
               {[1,2,3].map(i => (
                 <div key={i} className="h-10 w-10 rounded-full border-4 border-slate-50 bg-slate-200">
                   <img src={`https://picsum.photos/seed/voter${i}/100/100`} className="rounded-full" />
                 </div>
               ))}
             </div>
             <span>Active Election Ongoing</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-indigo-100/40 w-full"
        >
          <div className="mb-10 text-center">
            <div className="bg-slate-50 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Voter Verification</h2>
            <p className="text-sm text-slate-400">Enter your full name from the register</p>
          </div>

          <form onSubmit={handleGatekeeperAuth} className="space-y-6">
            <div>
              <input
                type="text"
                value={voterName}
                onChange={(e) => setVoterName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 font-semibold text-lg placeholder:text-slate-300"
                placeholder="Full Legal Name"
                required
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-medium border border-red-100"
              >
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-5 rounded-2xl text-lg font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
            >
              {loading ? 'Processing...' : (
                <>
                    Verify Identity
                  <ArrowRight className="h-6 w-6 group-hover:translate-x-1.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>

      <div className="mt-24 w-full grid md:grid-cols-2 gap-8">
        <div className="opacity-20 hover:opacity-100 transition-opacity">
          <SeedUtility />
        </div>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-50 border border-slate-100 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-indigo-50 hover:border-indigo-100 transition-all"
          onClick={() => navigate('/admin')}
        >
          <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
             <BarChart3 className="h-6 w-6 text-indigo-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-2">Live Tally Dashboard</h3>
          <p className="text-xs text-slate-400 mb-6">Authorized access to real-time election results and demographic analytics.</p>
          <button className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 group-hover:gap-3 transition-all">
            Access Results <ArrowRight className="h-3 w-3" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
