
import { useState } from 'react';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Database, Zap } from 'lucide-react';

export function SeedUtility() {
  const [seeding, setSeeding] = useState(false);
  const [done, setDone] = useState(false);

  const seedData = async () => {
    setSeeding(true);
    try {
      const batch = writeBatch(db);

      // 1. Positions
      const positions = [
        { id: 'pos_pres', title: 'President', order: 1 },
        { id: 'pos_sec', title: 'Secretary General', order: 2 },
        { id: 'pos_treas', title: 'Treasurer', order: 3 },
      ];

      positions.forEach(p => {
        batch.set(doc(db, 'positions', p.id), { title: p.title, order: p.order });
      });

      // 2. Candidates
      const candidates = [
        // President
        { id: 'c_p1', positionId: 'pos_pres', name: 'Alice Nsubuga', bio: 'Committed to innovation and transparency in leadership.', photoUrl: 'https://picsum.photos/seed/alice/400/400' },
        { id: 'c_p2', positionId: 'pos_pres', name: 'Bob Kasaija', bio: 'Experienced in community building and policy reform.', photoUrl: 'https://picsum.photos/seed/bob/400/400' },
        // Secretary
        { id: 'c_s1', positionId: 'pos_sec', name: 'Charlie Atwine', bio: 'Focusing on efficient communication and documentation.', photoUrl: 'https://picsum.photos/seed/charlie/400/400' },
        { id: 'c_s2', positionId: 'pos_sec', name: 'Diana Mbeki', bio: 'Dedicated to organizational excellence and inclusivity.', photoUrl: 'https://picsum.photos/seed/diana/400/400' },
        // Treasurer
        { id: 'c_t1', positionId: 'pos_treas', name: 'Edward Lutaaya', bio: 'Ensuring fiscal responsibility and clear accounting.', photoUrl: 'https://picsum.photos/seed/edward/400/400' },
        { id: 'c_t2', positionId: 'pos_treas', name: 'Fiona Namubiru', bio: 'Passionate about resource allocation and financial growth.', photoUrl: 'https://picsum.photos/seed/fiona/400/400' },
           // Deputy speaker
        { id: 'c_ds1', positionId: 'pos_ds', name: 'Grace Mbabazi', bio: 'Advocating for student welfare and academic excellence.', photoUrl: 'https://picsum.photos/seed/grace/400/400' },
        { id: 'c_ds2', positionId: 'pos_ds', name: 'Henry Rwakabanga', bio: 'Promoting inclusivity and social justice in the university.', photoUrl: 'https://picsum.photos/seed/henry/400/400' },
      ];

      candidates.forEach(c => {
        batch.set(doc(db, 'candidates', c.id), { 
          name: c.name, 
          positionId: c.positionId, 
          bio: c.bio, 
          photoUrl: c.photoUrl 
        });
      });

      // 3. Voters (Register)
      const voters = [
        { name: 'John Doe', gender: 'Male' },
        { name: 'Jane Smith', gender: 'Female' },
        { name: 'Alice Johnson', gender: 'Female' },
        { name: 'Bob Brown', gender: 'Male' },
        { name: 'Charlie Davis', gender: 'Male' },
      ];

      voters.forEach(v => {
        const id = v.name.toLowerCase().replace(/\s+/g, '_');
        batch.set(doc(db, 'voters', id), {
          name: v.name,
          name_normalized: v.name.toLowerCase(),
          gender: v.gender,
          status: 'Not Voted'
        });
      });

      await batch.commit();
      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Seeding failed. Check console.');
    } finally {
      setSeeding(false);
    }
  };

  if (done) return (
    <div className="bg-indigo-600 text-white p-8 rounded-[2rem] flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 animate-in fade-in zoom-in">
      <Zap className="h-6 w-6 stroke-[3px]" />
      Sample Environment Ready!
    </div>
  );

  return (
    <div className="bg-white border-2 border-slate-100 border-dashed p-10 rounded-[2.5rem] text-center">
      <Database className="h-12 w-12 text-slate-100 mx-auto mb-6" />
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mb-6">Infrastructure Tools</h3>
      <button
        onClick={seedData}
        disabled={seeding}
        className="text-xs font-bold bg-slate-900 hover:bg-black text-white py-4 px-8 rounded-2xl transition-all uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50"
      >
        {seeding ? 'Configuring...' : 'Seed Primary Data'}
      </button>
      <p className="text-[10px] font-bold text-slate-300 mt-6 uppercase tracking-tighter italic leading-relaxed">
        * Installs core positions, candidates, and sample voter register.
      </p>
    </div>
  );
}
