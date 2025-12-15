import { GoogleGenAI, Chat } from "@google/genai";
import { StudyMode, UserStats, StudyFile, StudySession } from "../types";
import { PROMPTS, SYSTEM_INSTRUCTION_CHAT, INSIGHTS_PROMPT, REVISION_PROMPT, EXAM_MODE_PROMPT } from "../constants";

// Initialize AI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Hybrid Model Strategy
const FLASH_MODEL = 'gemini-2.5-flash';
const PRO_MODEL = 'gemini-3-pro-preview';

// --- YOUTUBE TRANSCRIPT UTILITIES ---

function extractYoutubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// New Helper: Fetch Video Title/Author as fallback if transcript fails
async function fetchYoutubeMetadata(videoId: string): Promise<{title: string, author: string}> {
  try {
    // noembed is a public oEmbed service that doesn't block CORS/proxies usually
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await response.json();
    return { 
      title: data.title || "Unknown Video", 
      author: data.author_name || "Unknown Author" 
    };
  } catch (e) {
    console.warn("Failed to fetch video metadata", e);
    return { title: "YouTube Video", author: "Unknown" };
  }
}

async function fetchYoutubeTranscript(videoId: string): Promise<string | null> {
  // Try multiple proxies in case one is blocked or down
  const proxies = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url='
  ];

  for (const proxy of proxies) {
    try {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(proxy + encodeURIComponent(videoUrl));
      
      if (!response.ok) continue;
      
      const html = await response.text();
      
      // Strategy 1: Regex for captionTracks directly
      let tracksMatch = html.match(/"captionTracks":(\[.*?\])/);
      let captionTracks: any[] = [];

      if (tracksMatch && tracksMatch[1]) {
        captionTracks = JSON.parse(tracksMatch[1]);
      } else {
        // Strategy 2: Parse ytInitialPlayerResponse
        const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
        if (playerResponseMatch && playerResponseMatch[1]) {
           const playerResponse = JSON.parse(playerResponseMatch[1]);
           captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        }
      }

      if (!captionTracks || captionTracks.length === 0) {
        continue;
      }

      // Select Track (Prioritize English)
      const track = captionTracks.find((t: any) => t.languageCode === 'en') || 
                    captionTracks.find((t: any) => t.languageCode.startsWith('en')) || 
                    captionTracks[0];

      if (!track || !track.baseUrl) continue;

      // Fetch Transcript XML
      const transcriptResponse = await fetch(proxy + encodeURIComponent(track.baseUrl));
      if (!transcriptResponse.ok) continue;
      
      const transcriptXml = await transcriptResponse.text();

      // Parse XML to Text
      const textMatches = transcriptXml.matchAll(/<text[^>]*>(.*?)<\/text>/g);
      let fullText = "";
      for (const match of textMatches) {
        let line = match[1]
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');
        fullText += line + " ";
      }
      
      const cleanedText = fullText.trim();
      if (cleanedText.length > 0) {
        return cleanedText.substring(0, 80000); // Limit size
      }

    } catch (e) {
      console.warn(`Transcript fetch attempt failed via ${proxy}`, e);
    }
  }

  return null; // Failed all attempts
}

// --- HELPER FUNCTIONS ---

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.code === 429 || error.message?.includes('429') || error.message?.toLowerCase().includes('quota');
    
    if (retries > 0 && isRateLimit) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

const getLanguageInstruction = (lang: string) => {
  return lang && lang !== 'English' ? `\n\nIMPORTANT: Respond strictly in ${lang} language.` : '';
};

// --- API EXPORTS ---

export const generateStudyContent = async (
  text: string, 
  mode: StudyMode, 
  files?: StudyFile[],
  language: string = 'English'
): Promise<string> => {
  if (!text && (!files || files.length === 0)) return "";

  return retryWithBackoff(async () => {
    try {
      const parts: any[] = [];

      // Process Files (Async for transcripts)
      if (files && files.length > 0) {
        const processedParts = await Promise.all(files.map(async (file) => {
          if (file.mimeType === 'application/x-youtube') {
             const videoId = extractYoutubeVideoId(file.data);
             let content = `Source Material (YouTube Video URL): ${file.data}`;
             
             if (videoId) {
               // 1. Try to get full transcript
               const transcript = await fetchYoutubeTranscript(videoId);
               
               if (transcript) {
                 content += `\n\n[VIDEO TRANSCRIPT START]\n${transcript}\n[VIDEO TRANSCRIPT END]`;
               } else {
                 // 2. Fallback: Get Metadata and instruct AI to use general knowledge
                 const meta = await fetchYoutubeMetadata(videoId);
                 content += `\n\n[SYSTEM NOTE]: The exact transcript could not be extracted. 
                 However, the video is titled "${meta.title}" by "${meta.author}".
                 
                 IMPORTANT INSTRUCTION:
                 Please generate the study material (Explanation/Quiz/Summary) based on your extensive internal knowledge of the topic "${meta.title}".
                 Assume the video covers standard concepts related to this title.
                 Do NOT apologize or say you cannot access the video. Just teach the topic based on the title.`;
               }
             }
             return { text: content };
          } else {
             return {
                inlineData: {
                  mimeType: file.mimeType,
                  data: file.data
                }
             };
          }
        }));
        
        parts.push(...processedParts);
      }

      // Add text prompt
      const hasFiles = files && files.length > 0;
      const langInstruction = getLanguageInstruction(language);
      
      const promptText = hasFiles
        ? `${PROMPTS[mode]}${langInstruction}\n\n---\n\n(See attached documents/transcripts/metadata)\n\nAdditional Context/Notes:\n${text}`
        : `${PROMPTS[mode]}${langInstruction}\n\n---\n\nText to process:\n${text}`;

      parts.push({ text: promptText });
      
      const generationConfig: any = {
        // Updated system instruction to allow "General Knowledge" fallback for Videos
        systemInstruction: "You are a helpful study assistant. If a video transcript is provided, use it. If only a video title is provided, use your general knowledge of that topic to create the best possible study guide. Do not mention missing transcripts.",
      };

      if (mode === StudyMode.QUIZ) {
        generationConfig.responseMimeType = "application/json";
      }

      const response = await ai.models.generateContent({
        model: PRO_MODEL,
        contents: {
          role: 'user',
          parts: parts
        },
        config: generationConfig
      });

      return response.text || "No response generated.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  });
};

export const generateRevision = async (session: StudySession, language: string = 'English'): Promise<string> => {
  return retryWithBackoff(async () => {
    try {
      const contentParts = [
        `Session Title: ${session.title}`,
        `Date: ${session.date}`,
        session.originalText ? `Original Notes: ${session.originalText.substring(0, 2000)}...` : '',
        session.explanation ? `Generated Explanation: ${session.explanation}` : '',
        session.summary ? `Generated Summary: ${session.summary}` : '',
        session.flashcards ? `Generated Flashcards: ${session.flashcards}` : '',
        session.quiz ? `Generated Quiz: ${session.quiz}` : ''
      ].filter(Boolean).join('\n\n---\n\n');

      const langInstruction = getLanguageInstruction(language);

      const response = await ai.models.generateContent({
        model: PRO_MODEL,
        contents: {
          role: 'user',
          parts: [{ text: REVISION_PROMPT + langInstruction + "\n\nData to Analyze:\n" + contentParts }]
        }
      });

      return response.text || "Could not generate revision.";
    } catch (error) {
      console.error("Revision Error:", error);
      throw error;
    }
  });
};

export const generateExam = async (sessions: StudySession[], totalMarks: number, language: string = 'English'): Promise<string> => {
  return retryWithBackoff(async () => {
    try {
      let combinedContent = "";
      
      sessions.forEach((session, index) => {
        combinedContent += `\n\n=== SOURCE MATERIAL ${index + 1}: ${session.title} ===\n`;
        if (session.originalText) combinedContent += `Original Text: ${session.originalText.substring(0, 3000)}\n`;
        if (session.summary) combinedContent += `Summary: ${session.summary}\n`;
        if (session.quiz) combinedContent += `Existing Quiz Questions: ${session.quiz}\n`;
        if (session.explanation) combinedContent += `Explanation: ${session.explanation}\n`;
      });

      const langInstruction = getLanguageInstruction(language);
      const prompt = EXAM_MODE_PROMPT.replace('{{marks}}', totalMarks.toString()) + langInstruction;

      const response = await ai.models.generateContent({
        model: PRO_MODEL,
        contents: {
          role: 'user',
          parts: [{ text: prompt + "\n\nSTUDY MATERIALS TO EXAMINE:\n" + combinedContent }]
        },
        config: {
          responseMimeType: "application/json"
        }
      });

      return response.text || "Could not generate exam.";
    } catch (error) {
      console.error("Exam Generation Error:", error);
      throw error;
    }
  });
};

export const createChatSession = (language: string = 'English') => {
  const langInstruction = getLanguageInstruction(language);
  return ai.chats.create({
    model: FLASH_MODEL,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_CHAT + langInstruction + " If a video source has no transcript but has a title, explain the concept based on the title.",
      tools: [{ googleSearch: {} }],
    },
  });
};

export const sendChatMessage = async (
  chat: Chat, 
  message: string, 
  files?: StudyFile[]
): Promise<{ text: string, sources?: any[] }> => {
  return retryWithBackoff(async () => {
    try {
      let messageContent: any = [{ text: message }];

      if (files && files.length > 0) {
        const processedFiles = await Promise.all(files.map(async (file) => {
             if (file.mimeType === 'application/x-youtube') {
                 const videoId = extractYoutubeVideoId(file.data);
                 let textData = `Referenced Video: ${file.data}`;
                 if (videoId) {
                     const transcript = await fetchYoutubeTranscript(videoId);
                     if (transcript) {
                         textData += `\n\n[TRANSCRIPT]: ${transcript}`;
                     } else {
                         const meta = await fetchYoutubeMetadata(videoId);
                         textData += `\n\n[SYSTEM NOTE]: Transcript unavailable. Video Title: "${meta.title}". Use this title to answer user questions about the topic.`;
                     }
                 }
                 return { text: textData };
             } else {
                 return {
                    inlineData: {
                      mimeType: file.mimeType,
                      data: file.data
                    }
                 };
             }
        }));

        const textParts = processedFiles.filter(p => p.text).map(p => p.text).join('\n\n');
        const inlineParts = processedFiles.filter(p => p.inlineData);

        if (textParts) messageContent[0].text += "\n\n" + textParts;
        if (inlineParts.length > 0) messageContent.push(...inlineParts);
      }

      const response = await chat.sendMessage({ message: messageContent });
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

      return {
        text: response.text || "",
        sources: sources
      };
    } catch (error) {
      console.error("Chat Error:", error);
      throw error;
    }
  });
};

export const generateProgressInsights = async (stats: UserStats): Promise<string> => {
  return retryWithBackoff(async () => {
    try {
      const consistencyStr = stats.lastSevenDays.map(d => d.studied ? 'Yes' : 'No').join(', ');

      const statsString = `
        Total Interactions/Sessions: ${stats.totalSessions}
        Sessions Today: ${stats.sessionsToday}
        Sessions This Week: ${stats.sessionsThisWeek}
        Sessions This Month: ${stats.sessionsThisMonth}
        Total Study Time: ${Math.round(stats.totalTimeMinutes / 60)} hours
        Quizzes Generated: ${stats.quizzesGenerated}
        Quiz Accuracy: ${stats.quizAccuracy}%
        Current Streak: ${stats.currentStreak} days
        Longest Streak: ${stats.longestStreak} days
        Last 7 Days Consistency: [${consistencyStr}]
        Recent Topics: ${stats.topTopics.map(t => t.topic).join(', ')}
      `;

      const response = await ai.models.generateContent({
        model: FLASH_MODEL,
        contents: INSIGHTS_PROMPT + statsString,
      });

      return response.text || "Keep studying to unlock insights!";
    } catch (error) {
      console.error("Insight Error", error);
      return "Great job on your progress! Keep exploring new topics.";
    }
  }, 1); 
};