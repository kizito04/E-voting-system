
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, doc, writeBatch, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Position, Candidate, Voter, Vote } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ArrowRight, User, Info } from 'lucide-react';

interface VotingStepsProps {
  voter: Voter;
  onLogout: () => void;
}

export function VotingSteps({ voter, onLogout }: VotingStepsProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({}); // positionId -> candidateId
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const posRef = collection(db, 'positions');
        const posQuery = query(posRef, orderBy('order', 'asc'));
        const posSnap = await getDocs(posQuery);
        const posData = posSnap.docs.map(d => ({ id: d.id, ...d.data() } as Position));
        setPositions(posData);

        const candRef = collection(db, 'candidates');
        const candSnap = await getDocs(candRef);
        const candData = candSnap.docs.map(d => ({ id: d.id, ...d.data() } as Candidate));
        setCandidates(candData);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'positions/candidates');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filter to only positions that have at least one candidate registered
  const positionsWithCandidates = positions.filter(p =>
    candidates.some(c => c.positionId === p.id)
  );

  const currentPosition = positionsWithCandidates[currentStep];
  const positionCandidates = candidates.filter(c => c.positionId === currentPosition?.id);

  // Auto-select if only one candidate is available for this position
  useEffect(() => {
    if (currentPosition && positionCandidates.length === 1 && !selections[currentPosition.id]) {
      setSelections(prev => ({
        ...prev,
        [currentPosition.id]: positionCandidates[0].id
      }));
    }
  }, [currentStep, positionCandidates, currentPosition, selections]);

  const handleSelect = (candidateId: string) => {
    if (!currentPosition) return;
    setSelections(prev => ({
      ...prev,
      [currentPosition.id]: candidateId
    }));
  };

  const handleNext = () => {
    if (currentStep < positionsWithCandidates.length - 1) {
      setCurrentStep(curr => curr + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmitAll = async () => {
    setSubmitting(true);
    try {
      const batch = writeBatch(db);

      // Log each vote
      (Object.entries(selections) as [string, string][]).forEach(([posId, candId]) => {
        const voteRef = doc(collection(db, 'votes'));
        const voteData: Vote = {
          voterId: voter.id,
          candidateId: candId,
          positionId: posId,
          voterGender: voter.gender,
          timestamp: serverTimestamp()
        };
        batch.set(voteRef, voteData);
      });

      // Allow "Ahaisibwe Kizito" to vote unlimited times — don't mark as Completed
      const isUnlimitedVoter = voter.name.toLowerCase().trim() === 'ahaisibwe kizito';
      if (!isUnlimitedVoter) {
        const voterRef = doc(db, 'voters', voter.id);
        batch.update(voterRef, {
          status: 'Completed',
          completedAt: serverTimestamp()
        });
      }

      await batch.commit();
      onLogout(); // Clear local session
      navigate('/'); // Go back to check status
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'votes/voters');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (positionsWithCandidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-3xl border border-slate-200 shadow-xl max-w-md w-full"
        >
          <div className="h-20 w-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Info className="h-10 w-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">No Ballots Available</h2>
          <p className="text-sm text-slate-500 mb-6">
            There are currently no candidates registered for any positions. Please contact an administrator.
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
            Election Setup In Progress
          </p>
        </motion.div>
      </div>
    );
  }

  const isFinalStep = currentStep === positionsWithCandidates.length - 1;
  const currentSelection = (selections[currentPosition?.id] || '') as string;

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Stepper Header */}
      <div className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1">
             <div className="flex items-center gap-3 mb-3">
               <div className="bg-indigo-600 text-white h-7 w-7 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm shadow-indigo-100">
                 {currentStep + 1}
               </div>
               <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">Step {currentStep + 1} of {positionsWithCandidates.length}</span>
             </div>
             <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">{currentPosition?.title}</h1>
          </div>
          
          <div className="flex gap-2">
            {positionsWithCandidates.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 w-12 rounded-full transition-all duration-300 ${
                  i === currentStep ? 'bg-indigo-600 scale-x-110' : 
                  i < currentStep ? 'bg-slate-900' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentPosition?.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {positionCandidates.map((candidate) => (
            <motion.div
              key={candidate.id}
              onClick={() => handleSelect(candidate.id)}
              className={`bg-white rounded-[2rem] border-2 transition-all cursor-pointer overflow-hidden p-6 relative group ${
                currentSelection === candidate.id 
                  ? 'border-indigo-600 ring-8 ring-indigo-50 shadow-2xl shadow-indigo-100' 
                  : 'border-slate-100 hover:border-slate-300'
              }`}
            >
              <div className="relative aspect-square rounded-[1.5rem] overflow-hidden mb-8 bg-slate-50 border border-slate-100">
                <img 
                  src={candidate.photoUrl} 
                  alt={candidate.name} 
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                {currentSelection === candidate.id && (
                  <div className="absolute top-4 right-4 bg-indigo-600 text-white p-2 rounded-full shadow-lg">
                    <Check className="h-5 w-5 stroke-[3px]" />
                  </div>
                )}
              </div>

              <div className="px-2">
                <h3 className="text-2xl font-bold text-slate-900 mb-2 truncate">{candidate.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-3 mb-6 min-h-[4.5rem]">
                  {candidate.bio || "No biography provided for this candidate."}
                </p>
                
                <button 
                  className={`w-full py-4 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all ${
                    currentSelection === candidate.id 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white'
                  }`}
                >
                  {currentSelection === candidate.id ? 'Selected Candidate' : 'Select'}
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Floating Action Bar */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-[60]">
        <div className="bg-slate-900 text-white p-4 rounded-[2.5rem] shadow-2xl shadow-slate-900/40 flex items-center justify-between border border-white/10 backdrop-blur-md">
          <div className="px-6">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Your Selection</span>
             <p className="text-sm font-bold truncate max-w-[200px]">
               {currentSelection ? candidates.find(c => c.id === currentSelection)?.name : 'None selected'}
             </p>
          </div>

          {!isFinalStep ? (
            <button
              onClick={handleNext}
              disabled={!currentSelection}
              className="bg-indigo-600 text-white h-14 px-10 rounded-[2rem] font-bold hover:bg-indigo-700 transition-all disabled:opacity-30 disabled:grayscale flex items-center gap-3 group active:scale-95"
            >
              Next Position
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button
              onClick={handleSubmitAll}
              disabled={!currentSelection || submitting}
              className="bg-green-500 text-slate-900 h-14 px-10 rounded-[2rem] font-bold hover:bg-green-600 transition-all disabled:opacity-30 flex items-center gap-3 active:scale-95 shadow-lg shadow-green-500/20"
            >
              {submitting ? 'Submitting...' : 'Final Submission'}
              <Check className="h-5 w-5 stroke-[3px]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
