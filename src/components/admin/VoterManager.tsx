import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, writeBatch, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Voter } from '../../types';
import { Upload, FileSpreadsheet, Trash, Users, Check, X, Search } from 'lucide-react';

interface VoterManagerProps {
  voters: Voter[];
  loading: boolean;
}

export function VoterManager({ voters, loading: parentLoading }: VoterManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);

    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

      if (jsonData.length === 0) {
        setMessage({ text: 'Error: Excel file is empty.', type: 'error' });
        setUploading(false);
        return;
      }

      const headers = Object.keys(jsonData[0]);
      const nameCol = headers.find(h => h.toLowerCase().includes('name'));
      const genderCol = headers.find(h => h.toLowerCase().includes('gender') || h.toLowerCase().includes('sex'));
      const emailCol = headers.find(h => h.toLowerCase().includes('email'));
      const codeCol = headers.find(h => h.toLowerCase().includes('code') || h.toLowerCase().includes('access'));

      if (!nameCol) {
        setMessage({ text: 'Error: No "name" column found.', type: 'error' });
        setUploading(false);
        return;
      }

      const batch = writeBatch(db);
      let importCount = 0;

      jsonData.forEach(row => {
        const name = (row[nameCol] || '').trim();
        if (!name) return;

        const email = emailCol ? (row[emailCol] || '').trim().toLowerCase() : '';
        const accessCode = codeCol ? (row[codeCol] || '').toString().trim() : Math.floor(100000 + Math.random() * 900000).toString();
        
        let gender: 'Male' | 'Female' = 'Male';
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
          email,
          accessCode,
          status: 'Not Voted',
        });
        importCount++;
      });

      if (importCount === 0) {
        setMessage({ text: 'Error: No valid voter entries found.', type: 'error' });
        setUploading(false);
        return;
      }

      await batch.commit();
      setMessage({ text: `Successfully imported ${importCount} voters.`, type: 'success' });
    } catch (err) {
      console.error('Excel upload error:', err);
      setMessage({ text: 'Error: Failed to parse Excel file.', type: 'error' });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleClearVoters = async () => {
    if (!window.confirm('⚠ DELETE ALL registered voters? This cannot be undone.')) return;
    try {
      const batch = writeBatch(db);
      voters.forEach(v => batch.delete(doc(db, 'voters', v.id)));
      await batch.commit();
      setMessage({ text: 'All voters cleared successfully.', type: 'success' });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'voters');
    }
  };

  const filteredVoters = voters.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-xl shadow-indigo-100/30">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-indigo-50 p-3 rounded-2xl">
              <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Import Register</h3>
          </div>
          
          <p className="text-sm text-slate-500 mb-8">
            Upload an Excel file (.xlsx or .xls) with columns for <span className="font-bold text-slate-700">Name</span>, <span className="font-bold text-slate-700">Gender</span>, and <span className="font-bold text-slate-700">Email</span>.
          </p>

          <div className="relative">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleExcelUpload}
              disabled={uploading}
              className="hidden"
              id="voter-upload"
            />
            <label
              htmlFor="voter-upload"
              className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] p-12 cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="bg-slate-100 h-16 w-16 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-slate-400" />
              </div>
              <span className="font-bold text-slate-600 uppercase tracking-widest text-xs">
                {uploading ? 'Processing Data...' : 'Drop File or Click to Upload'}
              </span>
            </label>
          </div>

          {message && (
            <div className={`mt-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border ${
              message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
            }`}>
              {message.type === 'success' ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              {message.text}
            </div>
          )}
        </div>

        {/* Stats & Actions */}
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-xl shadow-indigo-100/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-indigo-50 p-3 rounded-2xl">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Voter Statistics</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Registered</p>
                <p className="text-3xl font-black text-slate-900">{voters.length}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status: Active</p>
                <p className="text-3xl font-black text-indigo-600">{voters.filter(v => v.status === 'Completed').length}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Ballots Cast</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleClearVoters}
            disabled={voters.length === 0 || parentLoading}
            className="w-full bg-red-50 text-red-600 border border-red-100 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all disabled:opacity-50"
          >
            <Trash className="h-5 w-5" />
            Wipe Voter Register
          </button>
        </div>
      </div>

      {/* Voter List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-indigo-100/30 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            Registered Voter List
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">({voters.length})</span>
          </h3>
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-semibold"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Voter Name</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gender</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVoters.map(v => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4">
                    <p className="font-bold text-slate-900">{v.name}</p>
                    <p className="text-[9px] font-medium text-slate-400 uppercase">ID: {v.id}</p>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      v.gender === 'Male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'
                    }`}>
                      {v.gender}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-500 font-medium">{v.email || '—'}</td>
                  <td className="px-8 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      v.status === 'Completed' ? 'bg-green-50 text-green-600' : 
                      v.status === 'In Progress' ? 'bg-amber-50 text-amber-600' : 
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {v.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredVoters.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-xs">
                    No voters found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
