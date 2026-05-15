import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Position, Candidate } from '../../types';
import { Plus, Users, List } from 'lucide-react';

interface CandidateManagerProps {
  positions: Position[];
  candidates: Candidate[];
  onRefresh: () => Promise<void>;
}

/**
 * Generates a slug from a title: "Chairperson" → "chairperson"
 */
function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

export function CandidateManager({ positions, candidates, onRefresh }: CandidateManagerProps) {
  const [newCandName, setNewCandName] = useState('');
  const [newCandPosId, setNewCandPosId] = useState('');
  const [newCandPhoto, setNewCandPhoto] = useState('');
  const [newCandBio, setNewCandBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'add' | 'list'>('add');

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
      await onRefresh();
      setView('list');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'candidates');
    } finally {
      setSaving(false);
    }
  };

  const candidatesByPosition = positions.map(p => ({
    position: p,
    candidates: candidates.filter(c => c.positionId === p.id)
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setView('add')}
          className={`px-6 py-3 rounded-2xl font-bold text-sm tracking-widest uppercase transition-all ${
            view === 'add' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500'
          }`}
        >
          <Plus className="h-4 w-4 inline mr-2" />
          Enroll Candidate
        </button>
        <button 
          onClick={() => setView('list')}
          className={`px-6 py-3 rounded-2xl font-bold text-sm tracking-widest uppercase transition-all ${
            view === 'list' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500'
          }`}
        >
          <List className="h-4 w-4 inline mr-2" />
          Registered Candidates
        </button>
      </div>

      {view === 'add' ? (
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
      ) : (
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
    </div>
  );
}
