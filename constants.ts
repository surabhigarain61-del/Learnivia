import { StudyMode } from './types';

export const APP_NAME = "Learnivia";

export const MOCK_USER = {
  email: "student@university.edu",
  plan: "Free",
  usageCount: 12,
  maxUsage: 20
};

export const LANGUAGES = [
  "English",
  "Bengali",
  "Hindi",
  "Tamil",
  "Spanish",
  "French",
  "German",
  "Chinese",
  "Japanese",
  "Korean"
];

export const PROMPTS = {
  [StudyMode.EXPLAIN]: `You are an expert tutor. Explain the following text in simple, student-friendly language. Avoid complex jargon. Use analogies and break concepts into steps where possible. Format using Markdown.`,
  
  [StudyMode.SUMMARIZE]: `Summarize the following text into concise bullet points. Focus on key concepts and main takeaways. Format using Markdown.`,
  
  [StudyMode.QUIZ]: `Generate a quiz based on the text. 
Output PURE JSON matching this schema:
Array<{
  id: number,
  type: "mcq" | "short_answer",
  question: string,
  options?: string[], // Required for mcq. array of 4 strings.
  correctAnswer: string, // The correct string value
  explanation: string, // Why it is correct
  keywords?: string[] // Required for short_answer. List of 3-5 key words that MUST be in the answer to be correct.
}>

Requirements:
- Create 5 MCQs and 2 Short Answer questions.
- For MCQs, provide 4 options.
- For Short Answer, provide a specific correct answer and keywords for grading.`,
  
  [StudyMode.FLASHCARDS]: `Create a set of flashcards from the following text. Output format should be a list of "Term: Definition". Focus on key terminology and dates. Format using Markdown.`
};

export const REVISION_PROMPT = `You are a high-performance study coach.
Create a "Quick Revision Guide" based on the provided study session data (Explanation, Summary, Quiz, Flashcards).
Synthesize all the available information into a single, cohesive, high-impact review document.

Structure:
1. 🎯 **Core Concept**: One sentence summary of the entire topic.
2. 🔑 **Key Takeaways**: Bullet points of the most critical facts.
3. ⚠️ **Tricky Points**: Common pitfalls or complex details often missed (infer from quiz/explanation).
4. 🧠 **Rapid Recall**: A quick list of "Must Know" terms.

Tone: Energetic, concise, and confidence-building.
Format: Clear Markdown with emojis.
`;

export const EXAM_MODE_PROMPT = `You are a strict academic examiner.
Create a comprehensive Exam Paper based on the provided study materials.
Output PURE JSON matching this schema:

Array<{
  id: number,
  type: "mcq" | "fill_blank" | "short_answer" | "long_answer",
  question: string,
  options?: string[], // Required ONLY for mcq.
  correctAnswer?: string, // Required for mcq, fill_blank.
  modelAnswer?: string, // Required for short_answer, long_answer. A detailed correct answer.
  explanation: string, // Explanation of the answer
  keywords?: string[], // Required for fill_blank, short_answer, long_answer. List of key terms for grading.
  marks: number // 1 for mcq/fill_blank, 2-5 for others.
}>

Requirements:
1. Total Marks must sum up to exactly: {{marks}}
2. Mix question types appropriately.
3. Cover topics from ALL provided sessions.
4. For 'fill_blank', ensure the blank is indicated by "______" in the question.
`;

export const SYSTEM_INSTRUCTION_CHAT = `You are a friendly, helpful, and exam-focused AI study companion. Your goal is to help students understand complex topics. Keep answers concise, encouraging, and accurate. Use Markdown for formatting.`;

export const INSIGHTS_PROMPT = `Generate a short, friendly study insight based on the student's analytics. 
Keep it to 2-3 sentences maximum.
Focus on their study consistency (streak), volume (sessions), and quiz performance (accuracy).
If quiz accuracy is low (<70%), suggest reviewing weak topics. If high, encourage them to keep it up.

Stats:
`;