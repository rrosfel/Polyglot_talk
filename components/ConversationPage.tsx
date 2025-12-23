import React, { useState, useCallback } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { ConversationLevel, Language, TranscriptMessage, SessionRecord, PracticeMode, GlossaryWord, TeacherName } from '../types';
import SetupPanel from './SetupPanel';
import { teacherProfiles } from '../constants';
import SessionSummaryModal from './SessionSummaryModal';
import { useLiveSession } from '../hooks/useLiveSession';

interface ConversationPageProps {
  addSessionToHistory: (session: SessionRecord) => void;
}

// Helper Components (Icons & Avatars)
const MicIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
        <path d="M17 11h-1c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92z" />
    </svg>
);

const StopIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6z" />
    </svg>
);

const GlossaryIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 4h2v5l-1-0.75L9 9V4zm-2 0h1v8l-2.5-1.5L6 12V4z" />
    </svg>
);

const TeacherAvatar = ({ isSpeaking }: { isSpeaking: boolean }) => (
    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center mr-4 flex-shrink-0 shadow-lg shadow-sky-900/20 ${isSpeaking ? 'animate-teacher-pulse ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-900' : ''}`}>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M4 12h1" /><path d="M19 12h1" /><path d="M12 4v1" /><path d="M12 19v1" /><path d="M8.5 8.5l-1 -1" /><path d="M16.5 16.5l-1 -1" /><path d="M8.5 15.5l-1 1" /><path d="M16.5 7.5l-1 1" /><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
      </svg>
    </div>
);

const UserAvatar = ({ isSpeaking }: { isSpeaking: boolean }) => (
    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center ml-4 flex-shrink-0 shadow-lg shadow-teal-900/20 ${isSpeaking ? 'animate-user-pulse ring-2 ring-teal-400 ring-offset-2 ring-offset-slate-900' : ''}`}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
            <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
        </svg>
    </div>
);

const ConversationPage: React.FC<ConversationPageProps> = ({ addSessionToHistory }) => {
  // --- Configuration State ---
  const [level, setLevel] = useState<ConversationLevel>(ConversationLevel.INTERMEDIATE);
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherName>('Clara');
  const [practiceMode, setPracticeMode] = useState<PracticeMode>(PracticeMode.OPEN);
  const [modeSpecifics, setModeSpecifics] = useState('');

  // --- Session State ---
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [sessionResult, setSessionResult] = useState<SessionRecord | null>(null);
  const [glossary, setGlossary] = useState<GlossaryWord[]>([]);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [hasNewGlossaryWord, setHasNewGlossaryWord] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // --- Hooks ---
  const handleToolCall = useCallback(async (functionCall: any) => {
      if (functionCall.name === 'addWordToGlossary') {
          const { word, definition, example } = functionCall.args;
          if (typeof word === 'string' && typeof definition === 'string' && typeof example === 'string') {
              setGlossary(prev => {
                  if (prev.some(item => item.word.toLowerCase() === word.toLowerCase())) {
                      return prev;
                  }
                  return [...prev, { word, definition, example }];
              });
              setHasNewGlossaryWord(true);
              return { result: "OK" };
          }
      }
      return null;
  }, []);

  const handleTranscriptUpdate = useCallback((text: string, speaker: 'user' | 'teacher', isFinal: boolean) => {
      if (isFinal) {
          setTranscript(prev => [...prev, { speaker, text }]);
      }
  }, []);

  const { 
      startSession, stopSession: stopLiveSession, isConversing, status, setStatus, liveUserTranscript, liveTeacherTranscript, error: liveError 
  } = useLiveSession({ 
      apiKey: process.env.API_KEY as string, 
      onToolCall: handleToolCall,
      onTranscriptUpdate: handleTranscriptUpdate
  });

  // --- Handlers ---
  const handleCloseSummary = () => {
    if (sessionResult) {
      addSessionToHistory(sessionResult);
    }
    setSessionResult(null);
    setTranscript([]);
    setStatus('idle');
  };

  const generateSessionSummary = async () => {
      if (transcript.length < 2) {
          setStatus('idle');
          return;
      }

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
          const fullTranscript = transcript.map(t => `${t.speaker === 'user' ? 'Student' : 'Teacher'}: ${t.text}`).join('\n');
          const prompt = `Analyze the following conversation transcript between a teacher (AI) and a student learning ${language}. The student's proficiency level is set to '${level}'. The analysis should be based ONLY on the provided transcript text, not on audio.

Transcript:
${fullTranscript}

Based on the student's performance in ${language}, provide a detailed evaluation in JSON format including overallScore, syntaxScore, grammarScore, pronunciationScore (0-100), mainMistakes, and pronunciationFeedback with specific tips.`;
          
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  overallScore: { type: Type.INTEGER },
                  syntaxScore: { type: Type.INTEGER },
                  grammarScore: { type: Type.INTEGER },
                  pronunciationScore: { type: Type.INTEGER },
                  mainMistakes: { type: Type.STRING },
                  pronunciationFeedback: {
                    type: Type.OBJECT,
                    properties: {
                      feedbackSummary: { type: Type.STRING },
                      mispronouncedWords: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            word: { type: Type.STRING },
                            correctPronunciation: { type: Type.STRING },
                            tip: { type: Type.STRING },
                          },
                          required: ['word', 'correctPronunciation', 'tip'],
                        },
                      },
                    },
                    required: ['feedbackSummary', 'mispronouncedWords'],
                  },
                },
                required: ['overallScore', 'syntaxScore', 'grammarScore', 'pronunciationScore', 'mainMistakes', 'pronunciationFeedback'],
              },
            },
          });
    
          const result = JSON.parse(response.text);
          const newSession: SessionRecord = {
            id: new Date().toISOString(), date: new Date().toISOString(), level, language,
            teacher: selectedTeacher, practiceMode, modeSpecifics,
            overallScore: result.overallScore, syntaxScore: result.syntaxScore, grammarScore: result.grammarScore, pronunciationScore: result.pronunciationScore, mainMistakes: result.mainMistakes, transcript,
            pronunciationFeedback: result.pronunciationFeedback,
            glossary,
          };
          setSessionResult(newSession);
      } catch (e) {
          console.error("Failed to generate summary:", e);
          setSummaryError("Could not generate session summary.");
          setStatus('idle');
      }
  };

  const handleStopConversation = async () => {
      await stopLiveSession();
      await generateSessionSummary();
  };

  const handleStartConversation = async () => {
      setSummaryError(null);
      setGlossary([]);
      setHasNewGlossaryWord(false);
      setTranscript([]);

      const teacherProfile = teacherProfiles[selectedTeacher];
      const addWordToGlossaryDeclaration: FunctionDeclaration = {
        name: 'addWordToGlossary',
        parameters: {
          type: Type.OBJECT,
          description: 'Adds a word, its definition, and an example sentence to the user\'s session glossary.',
          properties: {
            word: { type: Type.STRING, description: 'The vocabulary word to add.' },
            definition: { type: Type.STRING, description: 'A simple, clear definition of the word.' },
            example: { type: Type.STRING, description: 'An example sentence using the word in context.' }
          },
          required: ['word', 'definition', 'example']
        }
      };

      let systemInstruction = `
      ${teacherProfile.personality} 
      
      CRITICAL INSTRUCTION - LANGUAGE ADHERENCE:
      You are a strict language teacher. You must ALWAYS speak in ${language}. 
      If the user speaks a different language (e.g., their mother tongue), DO NOT switch to that language. 
      Instead, politely reply in ${language} that you do not understand or ask them to repeat it in ${language}.
      Never translate your own responses into another language. Stay immersed in ${language}.

      Your student is at a ${level} level in ${language}. Your primary goal is to help the user improve their spoken ${language} through a natural conversation. 
      Your most important task is to provide immediate, real-time feedback. If the user makes a mistake in grammar, syntax, or pronunciation in ${language}, you must gently interrupt them, point out the error, explain the correction, and have them try again. Do not wait until they finish their sentence. Maintain a positive and encouraging tone.

      When you introduce a new or potentially difficult vocabulary word, you MUST use the 'addWordToGlossary' tool to provide its definition and an example sentence.`;

      switch (practiceMode) {
        case PracticeMode.ROLEPLAY:
            systemInstruction += `\n\nYou will now conduct a role-playing exercise in ${language}. The scenario is: "${modeSpecifics || 'a general daily situation'}". You should take on the appropriate role (e.g., interviewer, waiter, shopkeeper). Start by setting the scene for the student and beginning the role-play.`;
            break;
        case PracticeMode.TOPIC:
            systemInstruction += `\n\nYou will now conduct a topic drill in ${language}. The topic is: "${modeSpecifics || 'a common interest'}". Keep the conversation focused on this topic. Ask questions, introduce relevant vocabulary, and encourage the student to discuss it in detail. Start by introducing the topic to the student.`;
            break;
        case PracticeMode.PRONUNCIATION:
            systemInstruction = `
            ${teacherProfile.pronunciationPersonality} 
            
            CRITICAL INSTRUCTION: Speak ONLY in ${language}.

            Your student is at a ${level} level and wants to practice their ${language} pronunciation.
            \n\nThe student wants to practice: "${modeSpecifics || 'common difficult words'}".
            \n\nYour task is to conduct a focused pronunciation drill:
            1.  Introduce the drill for the target sound/word(s) in ${language}.
            2.  Provide a single, clear word or a very short phrase for the student to pronounce.
            3.  After they speak, provide immediate, specific, and actionable feedback based on common pronunciation challenges for that word/sound. Focus on tongue placement, mouth shape, and airflow.
            4.  If they make a mistake, gently correct them and have them try the same word again.
            5.  If they pronounce it correctly, praise them and give them a new word or phrase to try.
            6.  Keep the drill focused and repetitive. Do not engage in general conversation.
            \n\nStart the drill now by giving the student their first word to practice.`;
            break;
        case PracticeMode.OPEN:
        default:
            systemInstruction += `\n\nStart by introducing yourself in ${language} and then propose a topic to discuss. The topic can be anything from daily life to complex subjects, but always ask for the user's agreement before proceeding. Start the conversation now.`;
            break;
      }

      await startSession({
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: teacherProfile.voice } } },
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: [addWordToGlossaryDeclaration] }],
      });
  };

  const statusText = {
    idle: "Ready to start",
    listening: "Listening...",
    speaking: `${selectedTeacher} is speaking...`,
    processing: "Wrapping up..."
  };
  
  const isStartDisabled = (practiceMode === PracticeMode.ROLEPLAY || practiceMode === PracticeMode.TOPIC || practiceMode === PracticeMode.PRONUNCIATION) && !modeSpecifics.trim();
  const activeError = liveError || summaryError;

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto md:px-6 relative">
      {/* Floating Glossary Button (Pill Style) */}
      {isConversing && (
          <button 
              onClick={() => { setIsGlossaryOpen(true); setHasNewGlossaryWord(false); }}
              className="fixed top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/40 backdrop-blur-md text-sky-400 hover:text-sky-300 hover:bg-slate-900/60 border border-white/10 transition-all shadow-xl group"
          >
              <div className="relative">
                <GlossaryIcon className="w-5 h-5" />
                {hasNewGlossaryWord && <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-slate-900"></span>}
              </div>
              <span className="text-sm font-medium">Glossary</span>
          </button>
      )}

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col p-4 md:py-8 h-full overflow-hidden relative">
        
        {/* Header - Only show when idle to focus on chat later */}
        {status === 'idle' && !sessionResult && (
             <header className="mb-4 md:mb-8 text-center animate-fade-in flex-shrink-0">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-sky-300 to-indigo-300 bg-clip-text text-transparent">
                    Talk with AI
                </h1>
                <p className="text-slate-400 font-medium text-sm md:text-base">Immersive language coaching</p>
            </header>
        )}
      
        {/* Setup Panel (Only visible when idle) - SCROLLABLE CONTAINER */}
        {status === 'idle' && !sessionResult && (
            <div className="w-full max-w-4xl mx-auto mb-10 overflow-y-auto custom-scrollbar h-full pr-2">
                 <SetupPanel 
                    level={level} setLevel={setLevel}
                    language={language} setLanguage={setLanguage}
                    selectedTeacher={selectedTeacher} setSelectedTeacher={setSelectedTeacher}
                    practiceMode={practiceMode} setPracticeMode={setPracticeMode}
                    modeSpecifics={modeSpecifics} setModeSpecifics={setModeSpecifics}
                />
                {/* Spacer to ensure content isn't hidden behind bottom controls */}
                <div className="h-10"></div>
            </div>
        )}

        {/* Error Display */}
        {activeError && (
            <div className="mx-auto my-4 px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-200 rounded-2xl text-sm font-medium backdrop-blur-sm flex-shrink-0 animate-fade-in">
            {activeError}
            </div>
        )}
      
        {/* Session Summary Modal */}
        {sessionResult && (
            <SessionSummaryModal sessionResult={sessionResult} onClose={handleCloseSummary} />
        )}
        
        {/* Glossary Modal */}
        {isGlossaryOpen && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setIsGlossaryOpen(false)}>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-slate-800 bg-slate-900/50">
                        <h2 className="text-xl font-bold text-white text-center tracking-tight">Session Glossary</h2>
                    </div>
                    <div className="p-6 flex-grow overflow-y-auto custom-scrollbar">
                        {glossary.length > 0 ? (
                            <ul className="space-y-6">
                                {glossary.map((item, index) => (
                                    <li key={index} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                                        <p className="text-lg text-sky-400 font-bold mb-1">{item.word}</p>
                                        <p className="text-slate-300 text-sm leading-relaxed mb-2">{item.definition}</p>
                                        <div className="pl-3 border-l-2 border-slate-600">
                                            <p className="text-slate-400 text-sm italic">"{item.example}"</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                                <GlossaryIcon className="w-10 h-10 mb-3 opacity-30" />
                                <p>Vocabulary captured during chat will appear here.</p>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-slate-900 border-t border-slate-800 text-center">
                        <button onClick={() => setIsGlossaryOpen(false)} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-full transition-colors text-sm">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Transcript Area */}
        <div className={`flex-grow flex flex-col justify-end transition-all duration-500 ${status === 'idle' ? 'h-0 opacity-0 hidden' : 'h-full opacity-100'}`}>
            <div className="flex-grow overflow-y-auto space-y-6 p-4 md:px-12 custom-scrollbar mask-image-b-0">
                {/* Placeholder for empty state */}
                {transcript.length === 0 && !liveUserTranscript && !liveTeacherTranscript && status !== 'processing' &&(
                    <div className="h-full flex items-center justify-center opacity-0"></div>
                )}
                
                {transcript.map((msg, index) => (
                <div key={index} className={`flex items-start max-w-2xl ${msg.speaker === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'} animate-fade-in`}>
                    {msg.speaker === 'teacher' && <TeacherAvatar isSpeaking={false} />}
                    <div className={`px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                        msg.speaker === 'user' 
                        ? 'bg-teal-600/20 text-teal-100 rounded-2xl rounded-tr-sm border border-teal-500/20' 
                        : 'bg-slate-800/80 text-slate-200 rounded-2xl rounded-tl-sm border border-slate-700/50'
                    }`}>
                    {msg.text}
                    </div>
                    {msg.speaker === 'user' && <UserAvatar isSpeaking={false} />}
                </div>
                ))}
                
                {/* Live Transcripts */}
                {liveUserTranscript && (
                    <div className="flex items-start max-w-2xl ml-auto justify-end animate-fade-in">
                        <div className="px-5 py-3.5 text-[15px] leading-relaxed rounded-2xl rounded-tr-sm bg-teal-600/10 text-teal-100/70 border border-teal-500/10 backdrop-blur-sm">
                            {liveUserTranscript}
                        </div>
                        <UserAvatar isSpeaking={true} />
                    </div>
                )}
                {liveTeacherTranscript && (
                    <div className="flex items-start max-w-2xl mr-auto justify-start animate-fade-in">
                        <TeacherAvatar isSpeaking={true} />
                        <div className="px-5 py-3.5 text-[15px] leading-relaxed rounded-2xl rounded-tl-sm bg-slate-800/50 text-slate-300/70 border border-slate-700/30 backdrop-blur-sm">
                            {liveTeacherTranscript}
                        </div>
                    </div>
                )}
                <div className="h-4"></div> {/* Bottom Spacer */}
            </div>
        </div>
      </div>

      {/* Control Area (Docked at bottom) */}
      <div className="p-2 pb-4 text-center relative z-20 flex-shrink-0">
        <div className="flex flex-col items-center justify-center">
            <button
                onClick={isConversing ? handleStopConversation : handleStartConversation}
                disabled={isStartDisabled}
                className={`group relative flex items-center justify-center w-16 h-16 rounded-2xl transition-all duration-500 ease-out shadow-2xl focus:outline-none disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed
                    ${isConversing 
                        ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-rose-900/30 hover:scale-105' 
                        : 'bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-900/30 hover:scale-105 hover:rotate-3'
                    }
                    ${status === 'listening' ? 'scale-110 ring-4 ring-red-500/20' : ''}
                `}
            >
                {isConversing ? (
                     <StopIcon className="w-6 h-6 text-white drop-shadow-md" />
                ) : (
                     <MicIcon className="w-6 h-6 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                )}
                
                {/* Status Indicator Dot */}
                {isConversing && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-slate-900"></span>
                    </span>
                )}
            </button>
            
            <p className={`mt-2 text-sm font-medium tracking-wide transition-colors duration-300 ${status === 'listening' ? 'text-sky-400 animate-pulse' : 'text-slate-500'}`}>
                {statusText[status]}
            </p>
        </div>
      </div>
    </div>
  );
};

export default ConversationPage;