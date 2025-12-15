import { StudySession, StudyEvent, ActivityType, UserStats } from "../types";
import { supabase } from "./supabase";
import { v4 as uuidv4 } from 'uuid';

// --- Helper Functions ---

const extractKeywords = (text: string): string[] => {
  if (!text) return [];
  const stopWords = new Set(['the', 'is', 'in', 'at', 'of', 'on', 'and', 'a', 'to', 'for', 'with', 'as', 'by', 'an', 'are', 'it', 'this', 'that', 'from']);
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
    
  return Array.from(new Set(words)).slice(0, 5);
};

// --- Session Management (Async) ---

export const saveSession = async (session: StudySession) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No user logged in");

    // Map frontend object to DB columns
    const dbPayload = {
      id: session.id,
      user_id: user.id,
      title: session.title,
      date: session.date,
      original_text: session.originalText, // Note the underscore for DB
      explanation: session.explanation,
      summary: session.summary,
      quiz: session.quiz,
      flashcards: session.flashcards,
      revision_guide: session.revisionGuide,
      last_revision_date: session.lastRevisionDate,
      files: session.files, // JSONB
      chat_history: session.chatHistory // JSONB
    };

    const { error } = await supabase
      .from('study_sessions')
      .upsert(dbPayload);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Supabase Save Error:", e);
    return false;
  }
};

export const getSessions = async (): Promise<StudySession[]> => {
  try {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map DB columns back to frontend object
    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      date: row.created_at || row.date, // Handle legacy or new date
      originalText: row.original_text,
      files: row.files,
      explanation: row.explanation,
      summary: row.summary,
      quiz: row.quiz,
      flashcards: row.flashcards,
      revisionGuide: row.revision_guide,
      lastRevisionDate: row.last_revision_date,
      chatHistory: row.chat_history
    }));
  } catch (e) {
    console.error("Supabase Fetch Error:", e);
    return [];
  }
};

export const deleteSession = async (id: string) => {
  try {
    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  } catch (e) {
    console.error("Delete Error", e);
  }
};

// --- Analytics (Async) ---

export const logActivity = async (
  type: ActivityType, 
  textContent: string = "", 
  extraData?: { 
    total_questions?: number, 
    correct_answers?: number,
    exam_score?: number,
    exam_total?: number,
    exam_subject?: string
  }
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Don't log if not logged in

    const newEvent = {
      user_id: user.id,
      action_type: type,
      timestamp: Date.now(),
      text_length: textContent.length,
      topic_keywords: extractKeywords(textContent),
      quiz_total_questions: extraData?.total_questions,
      quiz_correct_answers: extraData?.correct_answers,
      exam_score: extraData?.exam_score,
      exam_total_marks: extraData?.exam_total,
      exam_subject: extraData?.exam_subject
    };

    await supabase.from('study_activities').insert(newEvent);
  } catch (e) {
    console.error("Failed to log activity", e);
  }
};

export const getActivities = async (): Promise<StudyEvent[]> => {
  try {
    const { data, error } = await supabase
      .from('study_activities')
      .select('*')
      .order('timestamp', { ascending: true }); // Get oldest to newest for calc

    if (error) throw error;
    return data || [];
  } catch (e) {
    return [];
  }
};

// --- Stats Calculation ---

const calculateEventDuration = (event: StudyEvent): number => {
  if (event.action_type === 'quiz_complete' && event.quiz_total_questions) {
    return event.quiz_total_questions;
  }
  if (event.action_type === 'exam_complete' && event.exam_total_marks) {
    return Math.ceil(event.exam_total_marks * 1.5);
  }
  let duration = 1;
  if (event.text_length > 0) duration += Math.ceil(event.text_length / 500);
  if (event.action_type === 'quiz') duration += 2;
  return duration;
};

export const getUserStats = async (): Promise<UserStats> => {
  const events = await getActivities(); // Now async

  const now = new Date();
  const todayStr = now.toDateString();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

  // 1. Session Counts (Approximate via unique session creation events or DB count)
  // For better accuracy, we could count distinct sessions in DB, but let's use activity log
  const sessionCreates = events.filter(e => e.action_type === 'create_session');
  const totalSessions = sessionCreates.length;
  const sessionsToday = sessionCreates.filter(e => new Date(Number(e.timestamp)).toDateString() === todayStr).length;
  const sessionsThisWeek = sessionCreates.filter(e => Number(e.timestamp) > oneWeekAgo).length;
  const sessionsThisMonth = sessionCreates.filter(e => {
    const d = new Date(Number(e.timestamp));
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  // 2. Study Time
  let totalTimeMinutes = 0;
  let studyTimeToday = 0;
  let studyTimeThisWeek = 0;

  events.forEach(e => {
    const duration = calculateEventDuration(e);
    totalTimeMinutes += duration;
    const eventDate = new Date(Number(e.timestamp));
    if (eventDate.toDateString() === todayStr) studyTimeToday += duration;
    if (Number(e.timestamp) > oneWeekAgo) studyTimeThisWeek += duration;
  });

  // 3. Quizzes
  const quizzesGenerated = events.filter(a => a.action_type === 'quiz').length;
  const quizCompletions = events.filter(a => a.action_type === 'quiz_complete');
  const totalQuizzesTaken = quizCompletions.length;
  
  let totalQuizQuestions = 0;
  let totalQuizCorrect = 0;
  quizCompletions.forEach(q => {
    totalQuizQuestions += q.quiz_total_questions || 0;
    totalQuizCorrect += q.quiz_correct_answers || 0;
  });
  const quizAccuracy = totalQuizQuestions > 0 ? Math.round((totalQuizCorrect / totalQuizQuestions) * 100) : 0;

  // 4. Exam
  const examCompletions = events.filter(a => a.action_type === 'exam_complete');
  const totalExamsTaken = examCompletions.length;
  let examTotalScore = 0;
  let examTotalAccuracySum = 0;
  let examBestScore = 0;
  
  examCompletions.forEach(e => {
     const score = e.exam_score || 0;
     const total = e.exam_total_marks || 1;
     const acc = (score / total) * 100;
     examTotalScore += score;
     examTotalAccuracySum += acc;
     if (score > examBestScore) examBestScore = score;
  });
  const examAverageAccuracy = totalExamsTaken > 0 ? Math.round(examTotalAccuracySum / totalExamsTaken) : 0;
  const examAverageScore = totalExamsTaken > 0 ? parseFloat((examTotalScore / totalExamsTaken).toFixed(1)) : 0;

  // 5. Streaks
  const dates = events.map(a => new Date(Number(a.timestamp)).toDateString());
  const uniqueDates = Array.from(new Set(dates)).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  if (uniqueDates.length > 0) {
    for (let i = 0; i < uniqueDates.length; i++) {
      if (i === 0) tempStreak = 1;
      else {
        const prev = new Date(uniqueDates[i-1]);
        const curr = new Date(uniqueDates[i]);
        const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 3600 * 24);
        if (diffDays <= 1.5) tempStreak++;
        else tempStreak = 1;
      }
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    }
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const lastActive = uniqueDates[uniqueDates.length - 1];

    if (lastActive === today || lastActive === yesterday) {
       currentStreak = 1;
       for (let i = uniqueDates.length - 1; i > 0; i--) {
          const curr = new Date(uniqueDates[i]);
          const prev = new Date(uniqueDates[i-1]);
          const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 3600 * 24);
          if (diffDays <= 1.5) currentStreak++;
          else break;
       }
    } else currentStreak = 0;
  }

  // 6. Last 7 Days
  const lastSevenDays = [];
  for (let i = 6; i >= 0; i--) {
     const d = new Date();
     d.setDate(d.getDate() - i);
     const dateStr = d.toDateString();
     const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' }); 
     const studied = events.some(e => new Date(Number(e.timestamp)).toDateString() === dateStr);
     lastSevenDays.push({ day: dayLabel, date: dateStr, studied });
  }

  // 7. Topics
  const topicCounts: { [key: string]: number } = {};
  events.forEach(e => {
    if (e.topic_keywords && Array.isArray(e.topic_keywords)) {
      e.topic_keywords.forEach(keyword => {
         const k = keyword.trim().toLowerCase();
         if (k) topicCounts[k] = (topicCounts[k] || 0) + 1;
      });
    }
  });
  const topTopics = Object.entries(topicCounts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalSessions,
    sessionsToday,
    sessionsThisWeek,
    sessionsThisMonth,
    totalTimeMinutes,
    studyTimeToday,
    studyTimeThisWeek,
    quizzesGenerated,
    currentStreak,
    longestStreak,
    lastSevenDays,
    quizAccuracy,
    totalQuizQuestions,
    totalQuizCorrect,
    totalQuizzesTaken,
    totalExamsTaken,
    examAverageAccuracy,
    examAverageScore,
    examBestScore,
    topTopics
  };
};