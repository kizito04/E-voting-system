import React from 'react';
import { motion } from 'motion/react';
import { Users, Trophy, BarChart3 } from 'lucide-react';
import { Position, Voter } from '../../types';

interface AnalyticsOverviewProps {
  voters: Voter[];
  positions: Position[];
}

export function AnalyticsOverview({ voters, positions }: AnalyticsOverviewProps) {
  const totalVoters = voters.length;
  const votedCount = voters.filter(v => v.status === 'Completed').length;
  const progressPercentage = totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Election Analytics</h2>
        <p className="text-sm text-slate-500 font-medium">Overview of the current election status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card 1: Voter Participation */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 p-8 rounded-2xl border border-amber-200 shadow-xl shadow-slate-200/40"
        >
          <div className="flex justify-between items-start mb-8">
            <div className="bg-indigo-50 p-4 rounded-2xl">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <span className="text-xs font-bold uppercase text-slate-800 tracking-[0.2em]">Participation</span>
          </div>
          <div className="space-y-1">
             <div className="text-5xl font-black text-slate-900 leading-none">
               {votedCount}
               <span className="text-xl text-slate-300 ml-2 font-bold">/ {totalVoters}</span>
             </div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-4">Registered Voters</p>
          </div>
          <div className="flex items-center gap-2 mt-8">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Live Register Sync</span>
          </div>
        </motion.div>

        {/* Card 2: Active Fields */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-amber-50 p-8 rounded-2xl border border-amber-200 shadow-xl shadow-slate-200/40"
        >
          <div className="flex justify-between items-start mb-8">
            <div className="bg-amber-50 p-4 rounded-2xl">
              <Trophy className="h-6 w-6 text-amber-600" />
            </div>
            <span className="text-xs font-bold uppercase text-slate-800 tracking-[0.2em]">Active Fields</span>
          </div>
          <div className="space-y-1">
             <div className="text-5xl font-black text-slate-900 leading-none">{positions.length}</div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-4">Elective Positions</p>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-8 flex items-center gap-2">
            <div className="h-1 w-8 bg-slate-100 rounded-full" />
            Configured in System
          </p>
        </motion.div>

        {/* Card 3: Voting Progress */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-amber-50 p-8 rounded-2xl border border-amber-200 shadow-xl shadow-slate-200/40"
        >
          <div className="flex justify-between items-start mb-8">
            <div className="bg-emerald-50 p-4 rounded-2xl">
              <BarChart3 className="h-6 w-6 text-emerald-600" />
            </div>
            <span className="text-xs font-bold uppercase text-slate-800 tracking-[0.2em]">Progress</span>
          </div>
          <div className="space-y-1">
             <div className="text-5xl font-black text-slate-900 leading-none">{progressPercentage}%</div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-4">Completion Rate</p>
          </div>
          <div className="mt-8 space-y-3">
             <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
             </div>
             <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-[0.15em] text-center">
               {totalVoters - votedCount} Voters Remaining
             </p>
          </div>
        </motion.div>
      </div>


    </div>
  );
}
