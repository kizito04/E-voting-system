import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, setDoc, doc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Position, Candidate, Vote } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChevronLeft, ChevronRight, Users, Trophy, Download, Plus, LayoutGrid, BarChart3, Settings2, Pencil, Trash2, Check, X, Upload, FileSpreadsheet, Trash, List } from 'lucide-react';

/**
 * Generates a slug from a title: "Chairperson" → "chairperson"
 */
function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

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

  // Position editing state
  const [editingPosId, setEditingPosId] = useState<string | null>(null);
  const [editingPosTitle, setEditingPosTitle] = useState('');

  // Excel upload state
  const [uploadingVoters, setUploadingVoters] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Manage view tab
  const [manageView, setManageView] = useState<'positions' | 'candidates'>('positions');

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

  const refreshData = async () => {
    const posSnap = await getDocs(query(collection(db, 'positions'), orderBy('order', 'asc')));
    setPositions(posSnap.docs.map(d => ({ id: d.id, ...d.data() } as Position)));
    const candSnap = await getDocs(collection(db, 'candidates'));
    setCandidates(candSnap.docs.map(d => ({ id: d.id, ...d.data() } as Candidate)));
  };

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
    if (!newPosTitle.trim()) return;
    setSaving(true);
    try {
      const slug = slugify(newPosTitle);
      // Determine next order number
      const maxOrder = positions.reduce((max, p) => Math.max(max, p.order), 0);
      const newOrder = maxOrder + 1;
      
      await setDoc(doc(db, 'positions', slug), {
        title: newPosTitle.trim(),
        order: newOrder
      });
      setNewPosTitle('');
      await refreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'positions');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePosition = async (posId: string) => {
    if (!editingPosTitle.trim()) return;
    setSaving(true);
    try {
      // If title changed, we need to re-key the document
      const oldPos = positions.find(p => p.id === posId);
      const newSlug = slugify(editingPosTitle);
      
      if (oldPos && oldPos.id !== newSlug) {
        // Re-key: create new doc, copy candidates, delete old
        const batch = writeBatch(db);
        batch.set(doc(db, 'positions', newSlug), {
          title: editingPosTitle.trim(),
          order: oldPos.order
        });
        
        // Update all candidates to point to new position ID
        const affectedCandidates = candidates.filter(c => c.positionId === posId);
        affectedCandidates.forEach((c, i) => {
          const oldCandRef = doc(db, 'candidates', c.id);
          const newCandId = `${newSlug}_${i + 1}`;
          batch.set(doc(db, 'candidates', newCandId), {
            name: c.name,
            positionId: newSlug,
            photoUrl: c.photoUrl,
            bio: c.bio
          });
          batch.delete(oldCandRef);
        });
        
        batch.delete(doc(db, 'positions', posId));
        await batch.commit();
      } else {
        await updateDoc(doc(db, 'positions', posId), { title: editingPosTitle.trim() });
      }
      
      setEditingPosId(null);
      setEditingPosTitle('');
      await refreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'positions');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePosition = async (posId: string) => {
    if (!window.confirm('Delete this position and ALL associated candidates? This cannot be undone.')) return;
    setSaving(true);
    try {
      const associatedCandidates = candidates.filter(c => c.positionId === posId);
      const batch = writeBatch(db);
      batch.delete(doc(db, 'positions', posId));
      associatedCandidates.forEach(c => batch.delete(doc(db, 'candidates', c.id)));
      await batch.commit();
      await refreshData();
      if (currentPosIndex >= positions.length - 1) {
        setCurrentPosIndex(Math.max(0, positions.length - 2));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'positions');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandPosId || !newCandName.trim()) return;
    if (!newCandPhoto.trim()) {
      alert('Please paste a photo URL from ImgBB or another image host.');
      return;
    }
    setSaving(true);
    try {
      const posSlug = slugify(positions.find(p => p.id === newCandPosId)?.title || newCandPosId);
      // Find next candidate number for this position
      const existingForPos = candidates.filter(c => c.positionId === newCandPosId);
      const nextNum = existingForPos.length + 1;
      const candId = `${posSlug}_${nextNum}`;
      
      await setDoc(doc(db, 'candidates', candId), {
        name: newCandName.trim(),
        positionId: newCandPosId,
        photoUrl: newCandPhoto.trim(),
        bio: newCandBio.trim()
      });
      
      setNewCandName('');
      setNewCandPosId('');
      setNewCandPhoto('');
      setNewCandBio('');
      await refreshData();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'candidates');
    } finally {
      setSaving(false);
    }
  };

  // Excel voter upload handler
  const handleVoterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVoters(true);
    setUploadMessage(null);

    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

      if (jsonData.length === 0) {
        setUploadMessage('Error: Excel file is empty.');
        setUploadingVoters(false);
        return;
      }

      const headers = Object.keys(jsonData[0]);
      const nameCol = headers.find(h => h.toLowerCase().includes('name'));
      const genderCol = headers.find(h => h.toLowerCase().includes('gender') || h.toLowerCase().includes('sex'));

      if (!nameCol) {
        setUploadMessage('Error: No "name" column found. Please include a column with "Name" in the header.');
        setUploadingVoters(false);
        return;
      }

      const batch = writeBatch(db);
      let importCount = 0;

      jsonData.forEach(row => {
        const name = (row[nameCol] || '').trim();
        if (!name) return;

        let gender = 'Male';
        if (genderCol) {
          const rawGender = (row[genderCol] || '').trim().toLowerCase();
          if (rawGender.startsWith('f') || rawGender === 'female' || rawGender === 'woman') {
            gender = 'Female';
          }
        }

        const id = name.toLowerCase().replace(/\s+/g, '_');
        batch.set(doc(db, 'voters', id), {
          name,
          name_normalized: name.toLowerCase(),
          gender,
          status: 'Not Voted',
        });
        importCount++;
      });

      if (importCount === 0) {
        setUploadMessage('Error: No valid voter entries found.');
        setUploadingVoters(false);
        return;
      }

      await batch.commit();
      setUploadMessage(`Successfully imported ${importCount} voters from Excel.`);
    } catch (err) {
      console.error('Excel upload error:', err);
      setUploadMessage('Error: Failed to parse Excel file. Ensure the file is a valid .xlsx or .xls file.');
    } finally {
      setUploadingVoters(false);
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
      setCurrentPosIndex(0);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'all-data');
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

  // Group candidates by position for the list view
  const candidatesByPosition = positions.map(p => ({
    position: p,
    candidates: candidates.filter(c => c.positionId === p.id)
  }));

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
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block mb-1">Reports</span>
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
            className="space-y-12"
          >
            {/* Manage View Tabs */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setManageView('positions')}
                className={`px-6 py-3 rounded-2xl font-bold text-sm tracking-widest uppercase transition-all ${
                  manageView === 'positions' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                <LayoutGrid className="h-4 w-4 inline mr-2" />
                Positions
              </button>
              <button 
                onClick={() => setManageView('candidates')}
                className={`px-6 py-3 rounded-2xl font-bold text-sm tracking-widest uppercase transition-all ${
                  manageView === 'candidates' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                <List className="h-4 w-4 inline mr-2" />
                Registered Candidates
              </button>
            </div>

            {/* Clear All Data Button */}
            <div className="flex justify-end">
              <button
                onClick={handleClearAll}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-600 uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-50"
              >
                <Trash className="h-4 w-4" />
                Clear All Positions & Candidates
              </button>
            </div>

            {manageView === 'positions' ? (
              <div className="grid lg:grid-cols-2 gap-12">
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
                        placeholder="e.g. Chairperson"
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
                        <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
                          {editingPosId === p.id ? (
                            <div className="flex items-center gap-2 w-full">
                              <input
                                type="text"
                                value={editingPosTitle}
                                onChange={(e) => setEditingPosTitle(e.target.value)}
                                className="flex-1 bg-white border border-indigo-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdatePosition(p.id);
                                  if (e.key === 'Escape') { setEditingPosId(null); setEditingPosTitle(''); }
                                }}
                              />
                              <button
                                onClick={() => handleUpdatePosition(p.id)}
                                disabled={saving}
                                className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all disabled:opacity-50 flex-shrink-0"
                                title="Save"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => { setEditingPosId(null); setEditingPosTitle(''); }}
                                disabled={saving}
                                className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all disabled:opacity-50 flex-shrink-0"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div>
                                <span className="font-bold text-slate-700">{p.title}</span>
                                <span className="text-[9px] font-bold text-slate-300 ml-2">ID: {p.id}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold bg-white px-3 py-1 rounded-full border border-slate-100 text-slate-400">Order: {p.order}</span>
                                <button
                                  onClick={() => { setEditingPosId(p.id); setEditingPosTitle(p.title); }}
                                  disabled={saving}
                                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                                  title="Edit"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePosition(p.id)}
                                  disabled={saving}
                                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {positions.length === 0 && (
                        <p className="text-center text-slate-300 text-xs font-bold uppercase tracking-widest py-6">No positions defined yet</p>
                      )}
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
                          <option value="">Select Position</option>
                          {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Photo URL (ImgBB)</label>
                        <input
                          type="url"
                          required
                          value={newCandPhoto}
                          onChange={(e) => setNewCandPhoto(e.target.value)}
                          placeholder="https://i.ibb.co/..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold text-sm"
                        />
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
              </div>
            ) : (
              /* Registered Candidates List View */
              <div className="space-y-8">
                {candidatesByPosition.map(({ position, candidates: posCandidates }) => (
                  <div key={position.id} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-indigo-100/30">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="bg-indigo-50 p-2 rounded-xl">
                        <Users className="h-5 w-5 text-indigo-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">{position.title}</h3>
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        ({posCandidates.length} candidate{posCandidates.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    
                    {posCandidates.length === 0 ? (
                      <p className="text-xs font-bold text-slate-300 uppercase tracking-widest py-4 text-center">
                        No candidates enrolled for this position
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {posCandidates.map(c => (
                          <div key={c.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="h-14 w-14 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 border-2 border-white shadow-sm">
                              <img 
                                src={c.photoUrl} 
                                alt={c.name}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 text-sm truncate">{c.name}</p>
                              <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">ID: {c.id}</p>
                              {c.bio && <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{c.bio}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {candidatesByPosition.every(g => g.candidates.length === 0) && (
                  <div className="text-center py-16">
                    <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-300">No candidates registered yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Voter Register Upload */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-indigo-100/30">
              <div className="flex items-center gap-4 mb-10">
                <div className="bg-indigo-50 p-3 rounded-2xl">
                  <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Upload Voter Register</h3>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
                Upload an Excel file (.xlsx or .xls) with voter names and gender. Required columns: "Name" and "Gender" (or "Sex").
              </p>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-indigo-600 text-white px-6 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-slate-900 transition-all text-sm">
                  <Upload className="h-5 w-5" />
                  {uploadingVoters ? 'Importing...' : 'Select Excel File'}
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleVoterUpload}
                    disabled={uploadingVoters}
                    className="hidden"
                  />
                </label>
                {uploadingVoters && (
                  <div className="animate-spin h-6 w-6 border-3 border-indigo-600 border-t-transparent rounded-full"></div>
                )}
              </div>
              {uploadMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-6 p-4 rounded-2xl text-sm font-semibold ${
                    uploadMessage.startsWith('Success')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {uploadMessage}
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}