import React, { useState } from 'react';
import { doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Position, Candidate } from '../../types';
import { Plus, LayoutGrid, Pencil, Trash2, Check, X } from 'lucide-react';

interface PositionManagerProps {
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

export function PositionManager({ positions, candidates, onRefresh }: PositionManagerProps) {
  const [newPosTitle, setNewPosTitle] = useState('');
  const [editingPosId, setEditingPosId] = useState<string | null>(null);
  const [editingPosTitle, setEditingPosTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosTitle.trim()) return;
    setSaving(true);
    try {
      const slug = slugify(newPosTitle);
      const maxOrder = positions.reduce((max, p) => Math.max(max, p.order), 0);
      const newOrder = maxOrder + 1;
      
      await setDoc(doc(db, 'positions', slug), {
        title: newPosTitle.trim(),
        order: newOrder
      });
      setNewPosTitle('');
      await onRefresh();
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
      const oldPos = positions.find(p => p.id === posId);
      const newSlug = slugify(editingPosTitle);
      
      if (oldPos && oldPos.id !== newSlug) {
        const batch = writeBatch(db);
        batch.set(doc(db, 'positions', newSlug), {
          title: editingPosTitle.trim(),
          order: oldPos.order
        });
        
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
      await onRefresh();
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
      await onRefresh();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'positions');
    } finally {
      setSaving(false);
    }
  };

  return (
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
  );
}
