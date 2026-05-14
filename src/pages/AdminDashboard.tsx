
import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, addDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Position, Candidate, Vote } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChevronLeft, ChevronRight, Users, Trophy, Download, Plus, LayoutGrid, BarChart3, Settings2, Image as ImageIcon } from 'lucide-react';

export function AdminDashboard() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [currentPosIndex, setCurrentPosIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'results' | 'manage'>('results');

  // Management Forms State
  const [newPosTitle, setNewPosTitle] = useState('');
  const [newCandName, setNewCandName] = useState('');
  const [newCandPosId, setNewCandPosId] = useState('');
  const [newCandPhoto, setNewCandPhoto] = useState('');
  const [newCandBio, setNewCandBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchData() {
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
    }
    if (authorized) {
      fetchData();
    }
  }, [authorized]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setAuthorized(true);
    } else {
      alert('Invalid Password');
    }
  };

  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'positions'), {
        title: newPosTitle,
        order: positions.length + 1
      });
      setNewPosTitle('');
      // Refresh
      const posSnap = await getDocs(query(collection(db, 'positions'), orderBy('order', 'asc')));
      setPositions(posSnap.docs.map(d => ({ id: d.id, ...d.data() } as Position)));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'positions');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, 'candidates'), {
        name: newCandName,
        positionId: newCandPosId,
        photoUrl: newCandPhoto || 'https://picsum.photos/seed/placeholder/400/400',
        bio: newCandBio
      });
      setNewCandName('');
      setNewCandPosId('');
      setNewCandPhoto('');
      setNewCandBio('');
      // Refresh
      const candSnap = await getDocs(collection(db, 'candidates'));
      setCandidates(candSnap.docs.map(d => ({ id: d.id, ...d.data() } as Candidate)));
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'candidates');
    } finally {
      setSaving(false);
    }
  };

  if (!authorized) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-indigo-100 max-w-md w-full text-center"
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full font-display"></div>
      </div>
    );
  }

  const currentPosition = positions[currentPosIndex];
  const positionVotes = votes.filter(v => v.positionId === currentPosition?.id);
  const positionCandidates = candidates.filter(c => c.positionId === currentPosition?.id);

  const results = positionCandidates.map(c => {
    const candidateVotes = positionVotes.filter(v => v.candidateId === c.id);
    return {
      id: c.id,
      name: c.name,
      total: candidateVotes.length,
      males: candidateVotes.filter(v => v.voterGender === 'Male').length,
      females: candidateVotes.filter(v => v.voterGender === 'Female').length
    };
  }).sort((a, b) => b.total - a.total);

  const chartData = results.map(r => ({ name: r.name, value: r.total }));
  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-12 pb-24 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div>
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-3">Analytics & Control</h1>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTab('results')}
              className={`flex items-center gap-2 pb-2 border-b-2 font-bold text-sm tracking-widest uppercase transition-all ${
                activeTab === 'results' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Live Tally
            </button>
            <button 
              onClick={() => setActiveTab('manage')}
              className={`flex items-center gap-2 pb-2 border-b-2 font-bold text-sm tracking-widest uppercase transition-all ${
                activeTab === 'manage' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Organization
            </button>
          </div>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
        >
          <Download className="h-4 w-4" />
          Dump Dataset
        </button>
      </div>

      {activeTab === 'results' ? (
        <AnimatePresence mode="wait">
          <motion.div 
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">Aggregate Count</span>
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="text-4xl font-extrabold text-slate-900">{votes.length}</div>
                <div className="flex items-center gap-2 mt-4">
                  <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Synchronizing Live</span>
                </div>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">Active Fields</span>
                  <Trophy className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="text-4xl font-extrabold text-slate-900">{positions.length}</div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Elective Positions</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">Verified Feed</span>
                  <div className="h-5 w-5 bg-indigo-600 rounded-lg flex items-center justify-center"><div className="h-1.5 w-1.5 bg-white rounded-full animate-ping" /></div>
                </div>
                <div className="text-4xl font-extrabold text-slate-900">100%</div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Connection Integrity</p>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
                <div className="pl-4">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block mb-1">Navigation</span>
                  <h3 className="text-lg font-bold text-slate-900">{currentPosition?.title} Report</h3>
                </div>
                <div className="flex gap-4 pr-4">
                  <button
                    disabled={currentPosIndex === 0}
                    onClick={() => setCurrentPosIndex(i => i - 1)}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-50 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="h-5 w-5 text-indigo-600" />
                  </button>
                  <button
                    disabled={currentPosIndex === positions.length - 1}
                    onClick={() => setCurrentPosIndex(i => i + 1)}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-indigo-50 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="h-5 w-5 text-indigo-600" />
                  </button>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-indigo-100/40 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="p-10 border-b lg:border-b-0 lg:border-r border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {results.map((r) => (
                      <div key={r.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col items-center text-center">
                        <div className="h-24 w-24 rounded-2xl overflow-hidden bg-slate-100 border-4 border-slate-50 mb-4 group-hover:scale-105 transition-transform">
                           <img 
                             src={candidates.find(c => c.id === r.id)?.photoUrl} 
                             alt={r.name}
                             className="h-full w-full object-cover"
                             referrerPolicy="no-referrer"
                           />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 mb-1 leading-tight">{r.name}</h4>
                        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-6">
                           <span className="flex items-center gap-1">M: {r.males}</span>
                           <span className="flex items-center gap-1">F: {r.females}</span>
                        </div>
                        
                        <div className="w-full space-y-2 mt-auto">
                          <div className="flex justify-between items-end mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Election Share</span>
                            <span className="text-xl font-black text-indigo-600">{r.total} <span className="text-[10px] text-slate-300">Votes</span></span>
                          </div>
                          <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-50">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${positionVotes.length > 0 ? (r.total / positionVotes.length) * 100 : 0}%` }}
                              className="h-full bg-indigo-600 rounded-full transition-all duration-1000 shadow-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {results.length === 0 && (
                    <div className="py-20 text-center text-slate-300">
                       <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                       <p className="font-bold uppercase tracking-widest text-xs">No ballot data for this position</p>
                    </div>
                  )}
                </div>

                <div className="p-10 bg-slate-50/50 flex flex-col items-center justify-center min-h-[400px]">
                  {chartData.some(d => d.value > 0) ? (
                    <div className="w-full h-full min-h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {chartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 30px rgba(79, 70, 229, 0.1)', fontWeight: 'bold' }} 
                          />
                          <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '40px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center">
                       <div className="h-32 w-32 border-4 border-dashed border-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
                         <div className="h-20 w-20 bg-slate-100 rounded-full animate-pulse" />
                       </div>
                       <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Awaiting First Ballot</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div 
            key="manage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid lg:grid-cols-2 gap-12"
          >
            {/* New Position */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-indigo-100/30">
              <div className="flex items-center gap-4 mb-10">
                <div className="bg-indigo-50 p-3 rounded-2xl">
                  <LayoutGrid className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Define Position</h3>
              </div>
              <form onSubmit={handleAddPosition} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Position Title</label>
                  <input
                    type="text"
                    required
                    value={newPosTitle}
                    onChange={(e) => setNewPosTitle(e.target.value)}
                    placeholder="e.g. Secretary General"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
                  />
                </div>
                <button 
                  disabled={saving}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-all disabled:opacity-50"
                >
                  <Plus className="h-5 w-5" />
                  Add Position
                </button>
              </form>

              <div className="mt-12">
                 <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Current Positions</h4>
                 <div className="space-y-3">
                   {positions.map(p => (
                     <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="font-bold text-slate-700">{p.title}</span>
                        <span className="text-[10px] font-bold bg-white px-3 py-1 rounded-full border border-slate-100 text-slate-400">Order: {p.order}</span>
                     </div>
                   ))}
                 </div>
              </div>
            </div>

            {/* New Candidate */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-indigo-100/30">
              <div className="flex items-center gap-4 mb-10">
                <div className="bg-indigo-50 p-3 rounded-2xl">
                  <Users className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Enroll Candidate</h3>
              </div>
              <form onSubmit={handleAddCandidate} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Candidate Name</label>
                    <input
                      type="text"
                      required
                      value={newCandName}
                      onChange={(e) => setNewCandName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Position</label>
                    <select
                      required
                      value={newCandPosId}
                      onChange={(e) => setNewCandPosId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold appearance-none"
                    >
                      <option value="">Select Category</option>
                      {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Photo URL</label>
                    <div className="relative">
                      <input
                        type="url"
                        value={newCandPhoto}
                        onChange={(e) => setNewCandPhoto(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold pr-12"
                      />
                      <ImageIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Short Biography</label>
                    <textarea
                      value={newCandBio}
                      onChange={(e) => setNewCandBio(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold resize-none"
                    />
                  </div>
                </div>
                <button 
                  disabled={saving || !newCandPosId}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-all disabled:opacity-50 shadow-lg shadow-indigo-100"
                >
                  <Plus className="h-5 w-5" />
                  Enroll Candidate
                </button>
              </form>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
