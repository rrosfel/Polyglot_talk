import React, { useState } from 'react';
import type { SessionRecord } from '../types';
import ScoreChart from './ScoreChart';
import { jsPDF } from "jspdf";

interface HistoryPageProps {
  sessions: SessionRecord[];
  onBack: () => void;
}

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const SpinnerIcon = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// Cache the font base64 to avoid re-fetching on every download
let cachedRobotoFont: string | null = null;

const fetchRobotoFont = async () => {
    if (cachedRobotoFont) return cachedRobotoFont;
    try {
        const response = await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf");
        if (!response.ok) throw new Error("Failed to fetch font");
        const blob = await response.blob();
        return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                 const result = reader.result as string;
                 const base64 = result.split(',')[1];
                 cachedRobotoFont = base64;
                 resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Font loading error:", e);
        return null; 
    }
}

const HistoryPage: React.FC<HistoryPageProps> = ({ sessions, onBack }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-teal-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-rose-400';
  };

  const generatePDF = async (session: SessionRecord, e: React.MouseEvent) => {
      e.stopPropagation();
      setLoadingPdfId(session.id);
      
      try {
          const doc = new jsPDF();
          
          const fontBase64 = await fetchRobotoFont();
          if (fontBase64) {
              doc.addFileToVFS("Roboto-Regular.ttf", fontBase64);
              doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
              doc.setFont("Roboto");
          }

          // Header
          doc.setFontSize(22);
          doc.setTextColor(40, 40, 40);
          doc.text("Session Report", 20, 20);
          
          // Meta Info
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text(`Date: ${new Date(session.date).toLocaleString()}`, 20, 30);
          doc.text(`Language: ${session.language} | Level: ${session.level}`, 20, 35);
          doc.text(`Teacher: ${session.teacher} | Mode: ${session.practiceMode}`, 20, 40);
          
          doc.setDrawColor(200, 200, 200);
          doc.line(20, 45, 190, 45);
          
          doc.setFontSize(14);
          doc.setTextColor(0, 0, 0);
          doc.text("Performance Scores", 20, 55);
          
          doc.setFontSize(12);
          doc.text(`Overall: ${session.overallScore}/100`, 20, 65);
          doc.text(`Syntax: ${session.syntaxScore}`, 70, 65);
          doc.text(`Grammar: ${session.grammarScore}`, 110, 65);
          doc.text(`Pronunciation: ${session.pronunciationScore}`, 150, 65);

          let yPos = 80;

          // Mistakes
          doc.setFontSize(14);
          doc.text("Feedback & Mistakes", 20, yPos);
          yPos += 10;
          doc.setFontSize(10);
          doc.setTextColor(50, 50, 50);
          
          const mainMistakes = session.mainMistakes.replace(/[^\x00-\x7F\u0080-\uFFFF]/g, ""); 
          const mistakes = doc.splitTextToSize(mainMistakes, 170);
          doc.text(mistakes, 20, yPos);
          yPos += mistakes.length * 5 + 10;

          // Pronunciation
          if (session.pronunciationFeedback && session.pronunciationFeedback.mispronouncedWords.length > 0) {
              if (yPos > 250) { doc.addPage(); yPos = 20; }
              doc.setFontSize(14);
              doc.setTextColor(0, 0, 0);
              doc.text("Pronunciation Tips", 20, yPos);
              yPos += 10;
              doc.setFontSize(10);
              doc.setTextColor(50, 50, 50);
              
              session.pronunciationFeedback.mispronouncedWords.forEach(word => {
                  if (yPos > 270) { doc.addPage(); yPos = 20; }
                  doc.setFont("Roboto", 'bold'); 
                  doc.text(`${word.word} [${word.correctPronunciation}]`, 20, yPos);
                  
                  doc.setFont("Roboto", 'normal');
                  const tip = doc.splitTextToSize(`Tip: ${word.tip}`, 160);
                  doc.text(tip, 25, yPos + 5);
                  yPos += tip.length * 5 + 8;
              });
          }

          // Glossary
          if (session.glossary && session.glossary.length > 0) {
              if (yPos > 250) { doc.addPage(); yPos = 20; }
              yPos += 5;
              doc.setFontSize(14);
              doc.setTextColor(0, 0, 0);
              doc.text("Session Glossary", 20, yPos);
              yPos += 10;
              doc.setFontSize(10);
              doc.setTextColor(50, 50, 50);

              session.glossary.forEach(item => {
                  if (yPos > 260) { doc.addPage(); yPos = 20; }
                  doc.setFont("Roboto", 'bold');
                  doc.text(item.word, 20, yPos);
                  doc.setFont("Roboto", 'normal');
                  const def = doc.splitTextToSize(`Def: ${item.definition}`, 160);
                  doc.text(def, 25, yPos + 5);
                  yPos += def.length * 4; 
                  const ex = doc.splitTextToSize(`Ex: "${item.example}"`, 160);
                  doc.text(ex, 25, yPos + 5);
                  yPos += ex.length * 4 + 8;
              });
          }
          
          const fileName = `session-report-${new Date(session.date).toISOString().split('T')[0]}.pdf`;
          doc.save(fileName);
      } catch (e) {
          console.error("PDF generation failed:", e);
          alert("Could not generate PDF.");
      } finally {
          setLoadingPdfId(null);
      }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-fade-in">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <BackIcon />
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Your History</h1>
        </div>
        <div className="text-sm text-slate-500 font-medium">
            {sessions.length} Sessions
        </div>
      </header>
      
      {sessions.length > 0 ? (
        <div className="space-y-12">
          {/* Chart Section */}
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-300 mb-6 px-2">Performance Trend</h2>
            <ScoreChart data={sessions} />
          </div>

          {/* Grid Layout for Cards */}
          <div>
            <h2 className="text-lg font-bold text-slate-300 mb-6 px-2">Recent Activity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {sessions.map((session) => (
                <div key={session.id} className={`group bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden transition-all duration-300 hover:border-white/10 hover:bg-slate-800/60 ${expandedId === session.id ? 'row-span-2 shadow-2xl shadow-black/50 ring-1 ring-sky-500/20' : 'hover:shadow-lg'}`}>
                    
                    {/* Card Header (Always Visible) */}
                    <div className="p-6 cursor-pointer" onClick={() => toggleExpand(session.id)}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </p>
                                <p className="text-xl font-bold text-white flex items-center gap-2">
                                    {session.language}
                                    <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">{session.level}</span>
                                </p>
                            </div>
                            <div className={`text-right ${getScoreColor(session.overallScore)}`}>
                                <span className="text-3xl font-black tracking-tighter">{session.overallScore}</span>
                                <span className="text-sm font-medium text-slate-500 ml-1">%</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-slate-400 mb-4">
                            <span className="flex items-center gap-1">
                                👨‍🏫 {session.teacher}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                            <span>{session.practiceMode}</span>
                        </div>

                        {/* Mini Metrics */}
                        {!expandedId && (
                             <div className="flex gap-4 pt-4 border-t border-white/5">
                                 <div className="flex flex-col">
                                     <span className="text-xs text-slate-500 font-bold uppercase">Syn</span>
                                     <span className={`font-bold ${getScoreColor(session.syntaxScore)}`}>{session.syntaxScore}</span>
                                 </div>
                                 <div className="flex flex-col">
                                     <span className="text-xs text-slate-500 font-bold uppercase">Gra</span>
                                     <span className={`font-bold ${getScoreColor(session.grammarScore)}`}>{session.grammarScore}</span>
                                 </div>
                                 <div className="flex flex-col">
                                     <span className="text-xs text-slate-500 font-bold uppercase">Pro</span>
                                     <span className={`font-bold ${getScoreColor(session.pronunciationScore)}`}>{session.pronunciationScore}</span>
                                 </div>
                                 <div className="ml-auto">
                                    <span className="text-xs text-sky-400 font-medium group-hover:underline">View details</span>
                                 </div>
                             </div>
                        )}
                    </div>

                    {/* Expanded Details */}
                    {expandedId === session.id && (
                    <div className="px-6 pb-6 animate-fade-in border-t border-white/5 pt-4">
                         {/* Download Button */}
                         <div className="flex justify-end mb-6">
                            <button 
                                onClick={(e) => generatePDF(session, e)}
                                disabled={loadingPdfId === session.id}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wide rounded-lg transition-colors border border-white/10"
                            >
                                {loadingPdfId === session.id ? <SpinnerIcon /> : <DownloadIcon />}
                                {loadingPdfId === session.id ? "Generating..." : "Download Report"}
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="p-3 bg-slate-800/50 rounded-xl text-center">
                                <span className={`block text-xl font-bold ${getScoreColor(session.syntaxScore)}`}>{session.syntaxScore}</span>
                                <span className="text-xs text-slate-500 font-bold uppercase">Syntax</span>
                            </div>
                            <div className="p-3 bg-slate-800/50 rounded-xl text-center">
                                <span className={`block text-xl font-bold ${getScoreColor(session.grammarScore)}`}>{session.grammarScore}</span>
                                <span className="text-xs text-slate-500 font-bold uppercase">Grammar</span>
                            </div>
                            <div className="p-3 bg-slate-800/50 rounded-xl text-center">
                                <span className={`block text-xl font-bold ${getScoreColor(session.pronunciationScore)}`}>{session.pronunciationScore}</span>
                                <span className="text-xs text-slate-500 font-bold uppercase">Pronunciation</span>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wide mb-2">Feedback</h3>
                                <p className="text-slate-300 text-sm leading-relaxed bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                    {session.mainMistakes}
                                </p>
                            </div>

                            {session.pronunciationFeedback && session.pronunciationFeedback.mispronouncedWords.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wide mb-2">Pronunciation</h3>
                                    <ul className="space-y-2">
                                        {session.pronunciationFeedback.mispronouncedWords.map((item, index) => (
                                            <li key={index} className="bg-slate-800/50 p-3 rounded-xl border border-white/5 flex flex-col gap-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-white font-bold">{item.word}</span>
                                                    <span className="font-mono text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md">{item.correctPronunciation}</span>
                                                </div>
                                                <span className="text-xs text-slate-400">{item.tip}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {session.glossary && session.glossary.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wide mb-2">Glossary</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {session.glossary.map((g, i) => (
                                            <span key={i} className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg border border-white/5" title={`${g.definition}`}>
                                                {g.word}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    )}
                </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-slate-900/30 rounded-3xl border border-white/5 border-dashed">
          <p className="text-slate-500 text-lg font-medium">No sessions recorded yet.</p>
          <button onClick={onBack} className="mt-4 px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-full font-bold transition-colors">Start a Conversation</button>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;