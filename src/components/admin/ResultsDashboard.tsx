import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ChevronLeft, ChevronRight, Users, Trophy, BarChart3 } from 'lucide-react';
import { Position, Candidate, Vote, Voter } from '../../types';

interface ResultsDashboardProps {
  positions: Position[];
  candidates: Candidate[];
  votes: Vote[];
  voters: Voter[];
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function ResultsDashboard({ positions, candidates, votes, voters }: ResultsDashboardProps) {
  const [currentPosIndex, setCurrentPosIndex] = useState(0);

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

  // Progress stats
  const totalVoters = voters.length;
  const votedCount = voters.filter(v => v.status === 'Completed').length;
  const progressPercentage = totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0;

  return (
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
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">Voter Participation</span>
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="text-4xl font-extrabold text-slate-900">{votedCount} <span className="text-sm font-medium text-slate-400">/ {totalVoters}</span></div>
            <div className="flex items-center gap-2 mt-4">
              <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Live Register Sync</span>
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">Active Fields</span>
              <Trophy className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="text-4xl font-extrabold text-slate-900">{positions.length}</div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Registered Positions</p>
          </div>
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40">
            <div className="flex justify-between items-start mb-6">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest">Voting Progress</span>
              <div className="h-5 w-5 bg-indigo-600 rounded-lg flex items-center justify-center"><div className="h-1.5 w-1.5 bg-white rounded-full animate-ping" /></div>
            </div>
            <div className="text-4xl font-extrabold text-slate-900">{progressPercentage}%</div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${progressPercentage}%` }}
                 className="h-full bg-indigo-600 rounded-full"
               />
            </div>
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
  );
}
