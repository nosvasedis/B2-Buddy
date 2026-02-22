


export enum AppSection {
  DASHBOARD = 'DASHBOARD',
  SPEAKING = 'SPEAKING',
  LISTENING = 'LISTENING',
  READING = 'READING',
  ESSAY_TUTOR = 'ESSAY_TUTOR',
  DRILL = 'DRILL',
  PROFILE = 'PROFILE',
  GRAMMAR = 'GRAMMAR',
  VOCABULARY = 'VOCABULARY',
  DICTIONARY = 'DICTIONARY',
  SETTINGS = 'SETTINGS',
  EXAM = 'EXAM'
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  xp: number;
  completed: boolean;
  type: AppSection;
}

export interface StrategyTip {
  id: string;
  pillar: 'Speaking' | 'Writing' | 'Grammar' | 'Listening';
  tip: string;
  hack: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface DailyWord {
  word: string;
  type: string;
  definition: string;
  example: string;
  date?: string;
}

export interface LearningProfile {
  strengths: string[];
  weaknesses: string[];
  recentMistakes: string[];
  topicMastery: Record<string, number>;
}

export interface VocabItem {
  word: string;
  definition: string;
  nextReview: string;
  interval: number;
  easeFactor: number;
  streak: number;
  cefr?: string;
  partOfSpeech?: string;
  wordFamily?: string[];
  collectedAt?: string;
}

export interface SpeakingScore {
  grammarResource: number; // 1-5
  lexicalResource: number; // 1-5
  discourseManagement: number; // 1-5
  pronunciation: number; // 1-5
  interactiveCommunication: number; // 1-5
  overallBand: string; // e.g. "B2", "C1", "B1"
  status: 'PASS' | 'FAIL' | 'DISTINCTION' | 'BORDERLINE';
}

export interface SpeakingSession {
  id: string;
  date: string;
  part: string;
  topic: string;
  transcript: string;
  report: string;
  score?: SpeakingScore;
}

export interface UserStats {
  userId?: string;
  streak: number;
  wordsLearned: number;
  lastLoginDate: string;
  xp: number;
  username: string;
  name: string;
  avatar: string;
  themeColor?: string;
  colorMode?: 'auto' | 'light' | 'dark';
  accessory?: string;
  level: number;
  speakingSessionsCompleted: number;
  speakingHistory: SpeakingSession[];
  grammarProgress: string[];
  vocabProgress: string[];
  vocabItems: VocabItem[];
  currentQuests?: Quest[];
  currentDailyWord?: DailyWord | null;
  lessonCache: Record<string, LessonContent>;
  readingCache: Record<string, ReadingExercise>;
  drillCache: Record<string, DrillQuestion[]>;
  listeningCache: Record<string, ListeningExercise>;
  essayModels: Record<string, string>;
  learningProfile: LearningProfile;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  targetExamDate?: string | null;
}

export interface Exercise {
  id: number;
  type: 'multiple_choice' | 'fill_in_the_blank' | 'rewrite' | 'key_word_transformation';
  question: string;
  options?: string[];
  hint?: string;
  correctAnswer?: string;
  transformationKeyword?: string;
  transformationStart?: string;
  transformationEnd?: string;
}

export interface LessonContent {
  title: string;
  emoji: string;
  imageUrl?: string;
  theoryMarkdown: string;
  examples: string[];
  exercises: Exercise[];
  targetWords?: { word: string, definition: string }[];
}

export type ListeningType = 'PART1_MULTIPLE_CHOICE' | 'PART2_SENTENCES' | 'PART3_MATCHING' | 'PART4_INTERVIEW';

export interface ListeningQuestion {
  id: number;
  question: string;
  options?: string[];
  correctAnswer: string;
  evidence?: string;
}

export interface ListeningExercise {
  topic: string;
  type: ListeningType;
  script: string;
  audioScriptParts?: string[];
  questions: ListeningQuestion[];
  distractors?: string[];
  weekId?: string;
}

export interface ReadingExercise {
  title: string;
  type: 'Article' | 'Story' | 'Email' | 'Report';
  text: string;
  questions: {
    id: number;
    question: string;
    options: string[];
    correctAnswer: string;
    evidence: string;
  }[];
}

export enum EssayType {
  OPINION = "Opinion Essay",
  REVIEW = "Review",
  ARTICLE = "Article",
  REPORT = "Report",
  EMAIL = "Formal Email/Letter",
  STORY = "Story"
}

export interface DrillQuestion {
  id: string;
  type: 'WORD_FORMATION' | 'KEY_WORD_TRANSFORMATION' | 'OPEN_CLOZE' | 'MULTIPLE_CHOICE_CLOZE';
  prompt: string;
  rootWord?: string;
  keyword?: string;
  startText?: string;
  endText?: string;
  correctAnswer: string;
  options?: string[];
}
