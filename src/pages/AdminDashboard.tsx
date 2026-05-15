import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, doc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Position, Candidate, Vote } from '../types';
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
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'positions' | 'candidates' | 'voters'>('results');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authorized) {
      fetchData();
    }
  }, [authorized]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const posSnap = await getDocs(query(collection(db, 'positions'), orderBy('order', 'asc')));
      const posData = posSnap.docs.map(d => ({ id: d.id, ...d.data() } as Position));
      setPositions(posData);

      const candSnap = await getDocs(collection(db, 'candidates'));
      setCandidates(candSnap.docs.map(d => ({ id: d.id, ...d.data() } as Candidate)));

      const votesSnap = await getDocs(collection(db, 'votes'));
      setVotes(votesSnap.docs.map(d => d.data() as Vote));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'admin-data');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('⚠ DELETE ALL positions and candidates? This is irreversible. Type "DELETE" to confirm.')) return;
    const confirmation = window.prompt('Type DELETE to confirm:');
    if (confirmation !== 'DELETE') {
      alert('Clear cancelled.');
      return;
    }
    setSaving(true);
    try {
      const batch = writeBatch(db);
      positions.forEach(p => batch.delete(doc(db, 'positions', p.id)));
      candidates.forEach(c => batch.delete(doc(db, 'candidates', c.id)));
      await batch.commit();
      setPositions([]);
      setCandidates([]);
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
          <ResultsDashboard positions={positions} candidates={candidates} votes={votes} />
        )}
        {activeTab === 'voters' && (
          <VoterManager />
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