/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { VotingSteps } from './pages/VotingSteps';
import { AdminDashboard } from './pages/AdminDashboard';
import { PublicAnalytics } from './pages/PublicAnalytics';
import { PublicResults } from './pages/PublicResults';
import { Voter } from './types';

export default function App() {
  const [voter, setVoter] = useState<Voter | null>(null);

  useEffect(() => {
    const savedVoter = localStorage.getItem('voter_data');
    if (savedVoter) {
      setVoter(JSON.parse(savedVoter));
    }
  }, []);

  const handleLogin = (voterData: Voter) => {
    setVoter(voterData);
    localStorage.setItem('voter_data', JSON.stringify(voterData));
  };

  const handleLogout = () => {
    setVoter(null);
    localStorage.removeItem('voter_data');
  };

  return (
    <Router>
      <Layout voter={voter} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<LandingPage onLogin={handleLogin} voter={voter} />} />
          <Route 
            path="/vote" 
            element={voter ? <VotingSteps voter={voter} onLogout={handleLogout} /> : <Navigate to="/" />} 
          />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/analytics" element={<PublicAnalytics />} />
          <Route path="/results" element={<PublicResults />} />
        </Routes>
      </Layout>
    </Router>
  );
}

