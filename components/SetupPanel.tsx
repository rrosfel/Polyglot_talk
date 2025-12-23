import React from 'react';
import { ConversationLevel, Language, PracticeMode, TeacherName } from '../types';
import { teacherProfiles } from '../constants';

interface SetupPanelProps {
  level: ConversationLevel;
  setLevel: (l: ConversationLevel) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  selectedTeacher: TeacherName;
  setSelectedTeacher: (t: TeacherName) => void;
  practiceMode: PracticeMode;
  setPracticeMode: (m: PracticeMode) => void;
  modeSpecifics: string;
  setModeSpecifics: (s: string) => void;
}

const SetupPanel: React.FC<SetupPanelProps> = ({
  level, setLevel,
  language, setLanguage,
  selectedTeacher, setSelectedTeacher,
  practiceMode, setPracticeMode,
  modeSpecifics, setModeSpecifics,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in pb-4">
      
      {/* 1. Language & Level Block (Spans 8 cols) */}
      <div className="md:col-span-8 space-y-6 bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-xl">
        <div>
            <label className="block mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Language</label>
            <div className="flex flex-wrap gap-2">
                {Object.values(Language).map(l => 
                <button 
                    key={l} 
                    onClick={() => setLanguage(l)} 
                    className={`px-5 py-2.5 text-sm rounded-full transition-all duration-200 border ${language === l ? 'bg-sky-500 border-sky-400 text-white font-semibold shadow-lg shadow-sky-900/40' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                >
                    {l}
                </button>
                )}
            </div>
        </div>
        <div>
            <label className="block mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Proficiency</label>
            <div className="flex flex-wrap gap-2">
                {Object.values(ConversationLevel).map(l => 
                <button 
                    key={l} 
                    onClick={() => setLevel(l)} 
                    className={`px-5 py-2.5 text-sm rounded-full transition-all duration-200 border ${level === l ? 'bg-indigo-500 border-indigo-400 text-white font-semibold shadow-lg shadow-indigo-900/40' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                >
                    {l}
                </button>
                )}
            </div>
        </div>
      </div>

      {/* 2. Mode Block (Spans 4 cols - Tall) */}
      <div className="md:col-span-4 bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-xl flex flex-col">
         <label className="block mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest">Goal</label>
         <div className="grid grid-cols-2 md:flex md:flex-col gap-2 flex-grow">
            {Object.values(PracticeMode).map(m =>
                <button 
                    key={m} 
                    onClick={() => setPracticeMode(m)} 
                    className={`w-full text-left px-4 py-3 text-sm rounded-xl transition-all border leading-tight ${practiceMode === m ? 'bg-teal-500/10 border-teal-500/50 text-teal-300 font-semibold' : 'bg-slate-800/30 border-transparent text-slate-400 hover:bg-slate-800/60'}`}
                >
                    {m}
                </button>
            )}
         </div>
      </div>

      {/* 3. Teachers Block (Compact & Adaptive) */}
      <div className="md:col-span-12">
        <label className="block mb-2 text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Select your Tutor</label>
        <div className="flex flex-wrap gap-2">
            {Object.values(teacherProfiles).map(profile => (
                <button
                    key={profile.name}
                    onClick={() => setSelectedTeacher(profile.name)}
                    className={`group relative overflow-hidden text-left px-4 py-2 rounded-xl border transition-all duration-300 ${
                        selectedTeacher === profile.name 
                        ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-sky-500/50 ring-1 ring-sky-500/50 shadow-lg shadow-sky-900/20' 
                        : 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-800/60'
                    }`}
                >
                    <div className="relative z-10 flex flex-col justify-center h-full">
                        <div className="flex items-center gap-2 mb-0.5">
                             <h3 className={`text-sm font-bold ${selectedTeacher === profile.name ? 'text-white' : 'text-slate-300'}`}>{profile.name}</h3>
                             {selectedTeacher === profile.name && <div className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]"></div>}
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium group-hover:text-slate-400 transition-colors">{profile.description}</p>
                    </div>
                </button>
            ))}
        </div>
      </div>

      {/* 4. Context Input (Dynamic) */}
      <div className="md:col-span-12">
        {(practiceMode === PracticeMode.ROLEPLAY || practiceMode === PracticeMode.TOPIC || practiceMode === PracticeMode.PRONUNCIATION) && (
            <div className="bg-slate-900/60 p-1 rounded-2xl border border-white/10 flex items-center shadow-inner">
                <input
                    type="text"
                    value={modeSpecifics}
                    onChange={(e) => setModeSpecifics(e.target.value)}
                    className="w-full bg-transparent border-none text-white px-4 py-3 focus:ring-0 placeholder-slate-500 text-sm font-medium"
                    placeholder={
                        practiceMode === PracticeMode.ROLEPLAY ? "Describe the roleplay scenario (e.g. buying a train ticket)..." :
                        practiceMode === PracticeMode.TOPIC ? "Enter the topic (e.g. climate change)..." :
                        "Enter target words (e.g. 'thought', 'through')..."
                    }
                />
            </div>
        )}
      </div>
    </div>
  );
};

export default SetupPanel;