export enum AppView {
  LANDING = 'LANDING',
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  STUDY_SESSION = 'STUDY_SESSION',
  CHAT = 'CHAT',
  SAVED = 'SAVED',
  PROFILE = 'PROFILE',
  QUICK_REVISION = 'QUICK_REVISION',
  EXAM_MODE = 'EXAM_MODE'
}

export enum StudyMode {
  EXPLAIN = 'EXPLAIN',
  SUMMARIZE = 'SUMMARIZE',
  QUIZ = 'QUIZ',
  FLASHCARDS = 'FLASHCARDS'
}

export interface QuizItem {
  id: number;
  type: 'mcq' | 'short_answer';
  question: string;
  options?: string[]; // For MCQ
  correctAnswer: string;
  explanation?: string;
  keywords?: string[]; // For auto-grading short answers
}

export interface ExamItem {
  id: number;
  type: 'mcq' | 'fill_blank' | 'short_answer' | 'long_answer';
  question: string;
  options?: string[]; // For MCQ
  correctAnswer?: string; // For auto-grading
  modelAnswer?: string; // For long/short answer reference
  explanation?: string; // Why it is correct
  keywords?: string[]; // For grading text answers
  marks: number;
}

export interface StudyFile {
  mimeType: string;
  data: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  images?: string[]; // Array of base64 strings for UI display
  sources?: { web?: { uri: string; title: string } }[];
}

export interface StudySession {
  id: string;
  title: string;
  date: string;
  originalText: string;
  files?: StudyFile[];
  explanation?: string;
  summary?: string;
  quiz?: string; // Can be Markdown string (legacy) or JSON string (new)
  flashcards?: string;
  revisionGuide?: string; // Markdown content for Quick Revision
  lastRevisionDate?: string; // Timestamp of when revision was generated
  chatHistory?: ChatMessage[]; // Persisted chat messages
}

export interface UserProfile {
  email: string;
  plan: 'Free' | 'Pro';
  usageCount: number;
  maxUsage: number;
}

export interface ApiError {
  message: string;
}

// Analytics Types
export type ActivityType = 'create_session' | 'explain' | 'summarize' | 'quiz' | 'flashcards' | 'chat' | 'quiz_complete' | 'exam_complete';

// Deprecated StudyActivity in favor of StudyEvent
export interface StudyEvent {
  id: string;
  user_id: string;
  action_type: ActivityType;
  timestamp: number;
  text_length: number;
  topic_keywords: string[];
  quiz_total_questions?: number;
  quiz_correct_answers?: number;
  exam_score?: number;
  exam_total_marks?: number;
  exam_subject?: string;
}

export interface UserStats {
  totalSessions: number;
  sessionsToday: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  totalTimeMinutes: number;
  studyTimeToday: number;
  studyTimeThisWeek: number;
  quizzesGenerated: number;
  currentStreak: number;
  longestStreak: number;
  lastSevenDays: { day: string; date: string; studied: boolean }[];
  
  // Quiz Specifics
  quizAccuracy: number;
  totalQuizQuestions: number;
  totalQuizCorrect: number;
  totalQuizzesTaken: number;

  // Exam Analytics
  totalExamsTaken: number;
  examAverageAccuracy: number;
  examAverageScore: number;
  examBestScore: number;

  // Topic Analytics
  topTopics: { topic: string; count: number }[];
}