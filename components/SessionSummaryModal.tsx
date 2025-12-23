import React from 'react';
import { SessionRecord } from '../types';

interface SessionSummaryModalProps {
  sessionResult: SessionRecord;
  onClose: () => void;
}

const ScoreCircle = ({ score, label }: { score: number, label: string }) => {
    const getScoreColor = (s: number) => {
        if (s >= 85) return 'text-teal-400 stroke-teal-400';
        if (s >= 60) return 'text-yellow-400 stroke-yellow-400';
        return 'text-rose-400 stroke-rose-400';
    };

    return (
        <div className="flex flex-col items-center">
            <div className={`relative w-24 h-24 flex items-center justify-center`}>
                {/* Background Ring */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                        className="text-slate-800"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="currentColor" strokeWidth="2.5"
                    />
                    {/* Value Ring */}
                    <path
                        className={`${getScoreColor(score)} transition-all duration-1000 ease-out`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" strokeDasharray={`${score}, 100`} strokeLinecap="round" strokeWidth="2.5"
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <span className={`text-2xl font-black tracking-tighter ${getScoreColor(score).split(' ')[0]}`}>{score}</span>
                </div>
            </div>
            <span className="mt-2 text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</span>
        </div>
    );
};

const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({ sessionResult, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
        <div className="bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-white/5">
                <h2 className="text-3xl font-extrabold text-white text-center tracking-tight mb-1">Session Complete</h2>
                <p className="text-sm text-slate-400 text-center font-medium">{new Date(sessionResult.date).toLocaleString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            
            <div className="p-8">
                {/* Scores Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                    <ScoreCircle score={sessionResult.overallScore} label="Overall" />
                    <ScoreCircle score={sessionResult.syntaxScore} label="Syntax" />
                    <ScoreCircle score={sessionResult.grammarScore} label="Grammar" />
                    <ScoreCircle score={sessionResult.pronunciationScore} label="Pronunciation" />
                </div>
                
                <div className="space-y-8">
                    {/* Mistakes Block */}
                    <div className="bg-slate-800/30 rounded-2xl p-6 border border-white/5">
                         <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> Analysis
                        </h3>
                         <div className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{sessionResult.mainMistakes}</div>
                    </div>
                    
                    {/* Pronunciation Block */}
                    {sessionResult.pronunciationFeedback && (
                        <div className="bg-slate-800/30 rounded-2xl p-6 border border-white/5">
                            <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span> Pronunciation
                            </h3>
                            <p className="text-slate-400 mb-4 text-sm italic">"{sessionResult.pronunciationFeedback.feedbackSummary}"</p>
                            
                            {sessionResult.pronunciationFeedback.mispronouncedWords.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {sessionResult.pronunciationFeedback.mispronouncedWords.map((item, index) => (
                                    <div key={index} className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
                                        <div className="flex items-baseline justify-between mb-1">
                                            <p className="text-white font-bold">{item.word}</p>
                                            <p className="text-yellow-400 font-mono text-xs opacity-80">[{item.correctPronunciation}]</p>
                                        </div>
                                        <p className="text-slate-400 text-xs leading-tight">{item.tip}</p>
                                    </div>
                                ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Glossary Block */}
                    {sessionResult.glossary && sessionResult.glossary.length > 0 && (
                        <div className="bg-slate-800/30 rounded-2xl p-6 border border-white/5">
                            <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span> New Vocabulary
                            </h3>
                            <div className="space-y-3">
                            {sessionResult.glossary.map((item, index) => (
                                <div key={index} className="border-l-2 border-slate-700 pl-4">
                                    <p className="text-white font-bold">{item.word}</p>
                                    <p className="text-slate-400 text-xs mt-0.5">{item.definition}</p>
                                </div>
                            ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="p-6 bg-slate-900 border-t border-slate-800 sticky bottom-0 text-center">
                <button onClick={onClose} className="w-full md:w-auto px-10 py-3 bg-white text-slate-900 hover:bg-slate-200 font-bold rounded-full transition-colors shadow-lg shadow-white/10">
                    Continue Learning
                </button>
            </div>
        </div>
    </div>
  );
};

export default SessionSummaryModal;