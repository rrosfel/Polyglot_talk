import React, { useState, useEffect } from 'react';
import ConversationPage from './components/ConversationPage';
import HistoryPage from './components/HistoryPage';
import type { SessionRecord } from './types';

type Page = 'conversation' | 'history';

const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('conversation');
  const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>([]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('englishTutorHistory');
      if (storedHistory) {
        setSessionHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Could not load history from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('englishTutorHistory', JSON.stringify(sessionHistory));
    } catch (error) {
      console.error("Could not save history to localStorage", error);
    }
  }, [sessionHistory]);

  const addSessionToHistory = (session: SessionRecord) => {
    setSessionHistory(prev => [...prev, session].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setPage('history');
  };

  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-sky-500/30">
      {/* Navigation - Absolute to overlay nicely */}
      {page !== 'history' && (
        <button
          onClick={() => setPage('history')}
          className="fixed top-6 right-6 z-30 p-3 rounded-full bg-slate-900/40 backdrop-blur-md text-sky-400 hover:text-white hover:bg-slate-800 border border-white/10 transition-all shadow-xl group"
          aria-label="View history"
        >
          <HistoryIcon />
        </button>
      )}

      <main className="h-full">
        {page === 'conversation' && (
          <ConversationPage addSessionToHistory={addSessionToHistory} />
        )}
        {page === 'history' && (
          <HistoryPage sessions={sessionHistory} onBack={() => setPage('conversation')} />
        )}
      </main>
    </div>
  );
};

export default App;