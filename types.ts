export enum ConversationLevel {
  BASIC = 'Basic',
  INTERMEDIATE = 'Intermediate',
  PROFICIENT = 'Proficient',
  NATIVE = 'Native',
}

export enum Language {
  ENGLISH = 'English',
  GREEK = 'Greek',
  FRENCH = 'French',
}

export enum PracticeMode {
  OPEN = 'Open Conversation',
  ROLEPLAY = 'Role-play',
  TOPIC = 'Topic Drill',
  PRONUNCIATION = 'Pronunciation Drill',
}

export type TeacherName = 'Clara' | 'Amelia' | 'David';

export interface TeacherProfile {
  name: TeacherName;
  description: string;
  voice: 'Zephyr' | 'Kore' | 'Puck';
  personality: string;
  pronunciationPersonality: string;
}

export interface GlossaryWord {
  word: string;
  definition: string;
  example: string;
}

export interface TranscriptMessage {
  speaker: 'user' | 'teacher';
  text: string;
}

export interface MispronouncedWord {
  word: string;
  correctPronunciation: string;
  tip: string;
}

export interface PronunciationFeedback {
  feedbackSummary: string;
  mispronouncedWords: MispronouncedWord[];
}

export interface SessionRecord {
  id: string;
  date: string;
  level: ConversationLevel;
  language: Language;
  teacher: string;
  practiceMode: PracticeMode;
  modeSpecifics?: string;
  overallScore: number;
  syntaxScore: number;
  grammarScore: number;
  pronunciationScore: number;
  mainMistakes: string;
  transcript: TranscriptMessage[];
  pronunciationFeedback?: PronunciationFeedback;
  glossary?: GlossaryWord[];
}