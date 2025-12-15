import React, { useState, useEffect, useRef } from 'react';
import { StudySession, StudyMode, ChatMessage } from '../types';
import { generateStudyContent, createChatSession, sendChatMessage } from '../services/geminiService';
import { saveSession, logActivity } from '../services/storageService';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuizRunner } from './QuizRunner';
import { Button } from './Button';
import { ArrowLeft, BookOpen, Database, MessageSquare, Wand2, FileType, Plus, X, Upload, Clipboard, Sparkles, Send, User, FileText, Sun, Moon, Crown, Globe } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Chat } from '@google/genai';
import { LANGUAGES } from '../constants';

interface StudyViewerProps {
  session: StudySession;
  onBack: () => void;
  onUpdateSession: (session: StudySession) => void;
  onViewProfile: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  language: string;
  setLanguage: (lang: string) => void;
}

export const StudyViewer: React.FC<StudyViewerProps> = ({ session, onBack, onUpdateSession, onViewProfile, isDarkMode, onToggleTheme, language, setLanguage }) => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'sources' | 'chat' | 'generate'>('sources');
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(session.chatHistory || []);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Generate State
  const [loadingMode, setLoadingMode] = useState<StudyMode | null>(null);
  const [generatedResult, setGeneratedResult] = useState<{mode: StudyMode, content: string} | null>(null);

  // --- EFFECTS ---
  useEffect(() => {
    // Restore generated result if available from session
    if (session.explanation) setGeneratedResult({ mode: StudyMode.EXPLAIN, content: session.explanation });
    else if (session.summary) setGeneratedResult({ mode: StudyMode.SUMMARIZE, content: session.summary });
    else if (session.quiz) setGeneratedResult({ mode: StudyMode.QUIZ, content: session.quiz });
    else if (session.flashcards) setGeneratedResult({ mode: StudyMode.FLASHCARDS, content: session.flashcards });
    
    // Initialize Chat
    chatSessionRef.current = createChatSession(language);
    if (chatMessages.length === 0) {
        setChatMessages([{
            id: 'init',
            role: 'model',
            text: 'Welcome back! Review your sources or ask me questions about them.',
            timestamp: Date.now()
        }]);
    }
  }, [language]); // Re-init chat if language changes

  useEffect(() => {
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // --- HANDLERS: CHAT ---
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatSessionRef.current) return;
    
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      text: chatInput,
      timestamp: Date.now()
    };
    
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput('');
    setIsChatLoading(true);

    try {
      // Send context (files/text) with the message
      const filesToSend = session.files && session.files.length > 0 ? session.files : undefined;
      const textContext = session.originalText ? `\n\nContext Note: ${session.originalText}` : '';
      const finalMessage = userMsg.text + textContext;

      const { text: responseText, sources } = await sendChatMessage(
        chatSessionRef.current, 
        finalMessage, 
        filesToSend
      );

      const botMsg: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
        sources
      };
      
      const updatedHistory = [...newHistory, botMsg];
      setChatMessages(updatedHistory);
      
      // Persist Chat History
      const updatedSession = { ...session, chatHistory: updatedHistory };
      saveSession(updatedSession);
      onUpdateSession(updatedSession);

    } catch (e) {
      console.error(e);
      setChatMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'model',
        text: "Connection error. Please try again.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- HANDLERS: GENERATE ---
  const handleGenerate = async (mode: StudyMode) => {
    // Check if content already exists in session to avoid re-gen costs
    let content = "";
    if (mode === StudyMode.EXPLAIN && session.explanation) content = session.explanation;
    else if (mode === StudyMode.SUMMARIZE && session.summary) content = session.summary;
    else if (mode === StudyMode.QUIZ && session.quiz) content = session.quiz;
    else if (mode === StudyMode.FLASHCARDS && session.flashcards) content = session.flashcards;
    
    if (content) {
        // If content exists, switch immediately without loading state
        setGeneratedResult({ mode, content });
        return;
    }

    setLoadingMode(mode);
    try {
      content = await generateStudyContent(session.originalText, mode, session.files, language);
      
      // Save result
      const updatedSession = { ...session };
      if (mode === StudyMode.EXPLAIN) updatedSession.explanation = content;
      if (mode === StudyMode.SUMMARIZE) updatedSession.summary = content;
      if (mode === StudyMode.QUIZ) updatedSession.quiz = content;
      if (mode === StudyMode.FLASHCARDS) updatedSession.flashcards = content;
      
      saveSession(updatedSession);
      onUpdateSession(updatedSession);
      
      setGeneratedResult({ mode, content });
      logActivity(mode === StudyMode.QUIZ ? 'quiz' : 'explain', session.title);
      
    } catch (error) {
      console.error(error);
      alert("Error generating content.");
    } finally {
      setLoadingMode(null);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with Buttons */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0 px-1 lg:px-4 lg:pt-4">
        <div className="flex items-center gap-3 min-w-0">
             <button onClick={onBack} className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full text-gray-600 dark:text-gray-300 transition-colors">
                 <ArrowLeft size={24} />
             </button>
             <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight line-clamp-1">{session.title}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Last edited {new Date(session.date).toLocaleDateString()}</p>
             </div>
        </div>
        
        {/* Header Actions */}
        <div className="flex items-center gap-2 ml-4">
           {/* Theme Toggle */}
           <button 
             onClick={onToggleTheme}
             className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
             title="Toggle Theme"
           >
             {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
           </button>
           
           {/* Upgrade Button */}
           <button 
             className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold shadow-lg shadow-orange-500/20 hover:scale-105 transition-transform"
             onClick={() => alert("Upgrade feature coming soon!")}
           >
             <Crown size={18} fill="currentColor" />
             <span className="text-sm">Upgrade</span>
           </button>

           {/* Language Selector (Desktop) - Replaces Profile */}
           <div className="hidden md:flex items-center relative">
              <div className="absolute left-3 text-slate-400 pointer-events-none">
                 <Globe size={16} />
              </div>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
           </div>
        </div>
      </div>

       {/* TABS HEADER (Mobile Only) */}
       <div className="flex lg:hidden border-b border-gray-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-20">
            <button 
                onClick={() => setActiveTab('sources')}
                className={`flex-1 flex justify-center items-center gap-2 py-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'sources' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
                <Database size={18} /> Sources
            </button>
            <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 flex justify-center items-center gap-2 py-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'chat' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
                <MessageSquare size={18} /> Chat
            </button>
            <button 
                onClick={() => setActiveTab('generate')}
                className={`flex-1 flex justify-center items-center gap-2 py-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'generate' ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
                <Wand2 size={18} /> Guide
            </button>
        </div>

      {/* Main Layout: 3 Columns on Desktop, Single Column on Mobile */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative bg-white md:bg-gray-50/30 dark:bg-slate-900 dark:md:bg-slate-900/50">
        
        {/* --- LEFT COLUMN: SOURCES --- */}
        <div className={`
            flex-col h-full overflow-hidden 
            ${activeTab === 'sources' ? 'flex' : 'hidden'} 
            lg:flex lg:w-80 lg:border-r border-gray-200 dark:border-slate-800 lg:bg-gray-50/50 dark:lg:bg-slate-900 lg:flex-shrink-0
        `}>
             <div className="p-4 border-b border-gray-100 dark:border-slate-800 hidden lg:flex justify-between items-center bg-white/50 dark:bg-slate-900">
               <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                 <Database size={16} /> Sources
               </span>
               <span className="text-xs font-bold bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-2 py-0.5 rounded-full">{(session.files?.length || 0) + (session.originalText ? 1 : 0)}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {session.files?.map((file, idx) => {
                    const isImage = file.mimeType.startsWith('image/');
                    return (
                        <div key={idx} className="relative group bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm transition-all p-3 flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-slate-700 rounded-lg text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                                {isImage ? <FileType size={18} /> : <BookOpen size={18} />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-900 dark:text-slate-200 text-sm truncate">{file.name}</h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                                    {isImage ? 'Image' : 'PDF'}
                                </p>
                            </div>
                        </div>
                    );
                })}

                {session.originalText && (
                    <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm p-3 flex items-center gap-3">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 flex-shrink-0">
                            <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-900 dark:text-slate-200 text-sm">Copied Notes</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{session.originalText.length} chars</p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* --- CENTER COLUMN: CHAT --- */}
        <div className={`
            flex-col h-full bg-white dark:bg-slate-900 relative z-0 flex-1
            ${activeTab === 'chat' ? 'flex' : 'hidden'} 
            lg:flex
        `}>
             <div className="p-4 border-b border-gray-100 dark:border-slate-800 hidden lg:flex justify-between items-center">
                 <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                   <MessageSquare size={16} /> Chat
                 </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" ref={chatScrollRef}>
                {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-100 dark:bg-slate-800' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'}`}>
                            {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                        </div>
                        <div className={`max-w-[85%] lg:max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-slate-900 text-white dark:bg-slate-700 rounded-tr-sm' : 'bg-gray-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'}`}>
                            <MarkdownRenderer content={msg.text} isDark={isDarkMode || msg.role === 'user'} />
                        </div>
                    </div>
                ))}
                {isChatLoading && (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Sparkles size={16} />
                        </div>
                        <div className="bg-gray-100 dark:bg-slate-800 p-4 rounded-2xl rounded-tl-sm flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="relative max-w-4xl mx-auto">
                    <input 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={`Ask questions in ${language}...`}
                        className="w-full pl-5 pr-14 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10 focus:border-slate-900 dark:focus:border-slate-500 transition-all dark:text-white"
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim() || isChatLoading}
                        className="absolute right-2 top-2 bottom-2 p-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>

        {/* --- RIGHT COLUMN: GENERATE --- */}
        <div className={`
            flex-col h-full bg-gray-50/30 dark:bg-slate-900/30
            ${activeTab === 'generate' ? 'flex' : 'hidden'} 
            lg:flex lg:w-[450px] lg:border-l border-gray-200 dark:border-slate-800 lg:flex-shrink-0
        `}>
             <div className="p-4 border-b border-gray-100 dark:border-slate-800 hidden lg:flex justify-between items-center bg-white/50 dark:bg-slate-900/50">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                   <Wand2 size={16} /> Study Guide
                </span>
             </div>

             <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="w-full pb-20">
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <Button 
                            variant="secondary" 
                            onClick={() => handleGenerate(StudyMode.EXPLAIN)} 
                            isLoading={loadingMode === StudyMode.EXPLAIN}
                            className={`h-12 text-sm ${session.explanation ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : generatedResult?.mode === StudyMode.EXPLAIN ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                        >
                            Explain {session.explanation && <span className="ml-1 text-[10px]">✓</span>}
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={() => handleGenerate(StudyMode.SUMMARIZE)} 
                            isLoading={loadingMode === StudyMode.SUMMARIZE}
                            className={`h-12 text-sm ${session.summary ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : generatedResult?.mode === StudyMode.SUMMARIZE ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                        >
                            Summarize {session.summary && <span className="ml-1 text-[10px]">✓</span>}
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={() => handleGenerate(StudyMode.QUIZ)} 
                            isLoading={loadingMode === StudyMode.QUIZ}
                            className={`h-12 text-sm ${session.quiz ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : generatedResult?.mode === StudyMode.QUIZ ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                        >
                            Quiz {session.quiz && <span className="ml-1 text-[10px]">✓</span>}
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={() => handleGenerate(StudyMode.FLASHCARDS)} 
                            isLoading={loadingMode === StudyMode.FLASHCARDS}
                            className={`h-12 text-sm ${session.flashcards ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : generatedResult?.mode === StudyMode.FLASHCARDS ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                        >
                            Flashcards {session.flashcards && <span className="ml-1 text-[10px]">✓</span>}
                        </Button>
                    </div>

                    {generatedResult ? (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-slate-700">
                                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                    <Wand2 size={16} />
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white capitalize text-sm">{generatedResult.mode} Result</h3>
                            </div>
                            
                            {/* CONDITIONAL RENDERING FOR QUIZ VS MARKDOWN */}
                            {generatedResult.mode === StudyMode.QUIZ ? (
                                <QuizRunner 
                                    content={generatedResult.content} 
                                    title={session.title} 
                                    isDark={isDarkMode}
                                />
                            ) : (
                                <MarkdownRenderer content={generatedResult.content} isDark={isDarkMode} />
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                            <p className="text-gray-400 font-medium text-sm">Select a tool above to generate content from your sources.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};