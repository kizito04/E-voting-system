import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, doc, writeBatch, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Position, Candidate, Vote, Voter } from '../types';
import { BarChart3, LayoutGrid, Users, Download, Trash, Settings2 } from 'lucide-react';

// New Components
import { AdminAuth } from '../components/admin/AdminAuth';
import { PositionManager } from '../components/admin/PositionManager';
import { CandidateManager } from '../components/admin/CandidateManager';
import { VoterManager } from '../components/admin/VoterManager';
import { ResultsDashboard } from '../components/admin/ResultsDashboard';

export function AdminDashboard() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'positions' | 'candidates' | 'voters'>('results');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authorized) return;

    setLoading(true);

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
  }, [authorized]);

  const fetchData = async () => {
    // This is now handled by onSnapshot
    return Promise.resolve();
  };

  const handleClearAll = async () => {
    if (!window.confirm('⚠ RESET ENTIRE SYSTEM? This will delete ALL positions, candidates, voters, and votes. Type "RESET" to confirm.')) return;
    const confirmation = window.prompt('Type RESET to confirm:');
    if (confirmation !== 'RESET') {
      alert('Reset cancelled.');
      return;
    }
    setSaving(true);
    try {
      // For large datasets, we should do this in chunks, but for now we try a batch
      const batch = writeBatch(db);
      
      // Clear Positions
      positions.forEach(p => batch.delete(doc(db, 'positions', p.id)));
      
      // Clear Candidates
      candidates.forEach(c => batch.delete(doc(db, 'candidates', c.id)));
      
      // Clear Voters
      voters.forEach(v => batch.delete(doc(db, 'voters', v.id)));
      
      // Clear Votes (limited to 500 to stay within batch limit)
      const votesSnap = await getDocs(query(collection(db, 'votes')));
      votesSnap.docs.slice(0, 400).forEach(d => batch.delete(doc(db, 'votes', d.id)));

      await batch.commit();
      alert('System reset partially complete. If data remains, please run reset again.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'all-data');
    } finally {
      setSaving(false);
    }
  };

  if (!authorized) {
    return <AdminAuth onLogin={() => setAuthorized(true)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-24 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-3">Control Center</h1>
          <div className="flex flex-wrap items-center gap-6">
            {[
              { id: 'results', label: 'Live Tally', icon: BarChart3 },
              { id: 'voters', label: 'Voters', icon: Users },
              { id: 'positions', label: 'Positions', icon: LayoutGrid },
              { id: 'candidates', label: 'Candidates', icon: Settings2 },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 pb-2 border-b-2 font-bold text-sm tracking-widest uppercase transition-all ${
                  activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export Results
          </button>
          <button
            onClick={handleClearAll}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-600 uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-50"
          >
            <Trash className="h-4 w-4" />
            Reset System
          </button>
        </div>
      </div>

      <div className="mt-8">
        {activeTab === 'results' && (
          <ResultsDashboard positions={positions} candidates={candidates} votes={votes} voters={voters} />
        )}
        {activeTab === 'voters' && (
          <VoterManager voters={voters} loading={loading} />
        )}
        {activeTab === 'positions' && (
          <div className="max-w-3xl">
             <PositionManager positions={positions} candidates={candidates} onRefresh={fetchData} />
          </div>
        )}
        {activeTab === 'candidates' && (
          <CandidateManager positions={positions} candidates={candidates} onRefresh={fetchData} />
        )}
      </div>
    </div>
  );
}