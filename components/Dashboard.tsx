import React, { useState, useRef, useEffect } from 'react';
import { StudyMode, StudySession, StudyFile, ChatMessage } from '../types';
import { generateStudyContent, createChatSession, sendChatMessage } from '../services/geminiService';
import { saveSession, logActivity } from '../services/storageService';
import { Button } from './Button';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuizRunner } from './QuizRunner';
import { FileText, CircleHelp, Layers, Upload, FileType, X, Plus, Wand2, Database, Clipboard, BookOpen, MessageSquare, Sparkles, Send, User, Sun, Moon, Crown, Settings, AlertTriangle, Globe, Youtube, LogIn } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Chat } from '@google/genai';
import { LANGUAGES } from '../constants';

interface DashboardProps {
  onSessionCreated: (session: StudySession) => void;
  onViewProfile: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  user: any;
  onAuthRequest: () => void;
}

const MAX_SOURCE_LIMIT = 30;

export const Dashboard: React.FC<DashboardProps> = ({ onSessionCreated, onViewProfile, isDarkMode, onToggleTheme, language, setLanguage, user, onAuthRequest }) => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'sources' | 'chat' | 'generate'>('sources');
  
  // Data
  const [text, setText] = useState('');
  const [files, setFiles] = useState<StudyFile[]>([]);
  // Track the current session ID to prevent creating duplicates
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Generate State
  const [loadingMode, setLoadingMode] = useState<StudyMode | null>(null);
  const [generatedResult, setGeneratedResult] = useState<{mode: StudyMode, content: string} | null>(null);
  // Cache for generated content to prevent re-generation and allow saving multiple parts
  const [resultsCache, setResultsCache] = useState<{
    [StudyMode.EXPLAIN]?: string;
    [StudyMode.SUMMARIZE]?: string;
    [StudyMode.QUIZ]?: string;
    [StudyMode.FLASHCARDS]?: string;
  }>({});

  // Modal State
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [modalView, setModalView] = useState<'menu' | 'text'>('menu');
  const [tempText, setTempText] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- EFFECTS ---
  useEffect(() => {
    // Initialize Chat Session with selected language
    chatSessionRef.current = createChatSession(language);
    setChatMessages([{
      id: 'init',
      role: 'model',
      text: 'Hello! Add some sources, then ask me anything about them.',
      timestamp: Date.now()
    }]);
  }, [language]); // Re-init chat if language changes

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // --- HANDLERS: SOURCES ---

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > MAX_SOURCE_LIMIT) {
      alert(`Source limit exceeded! You can only add up to ${MAX_SOURCE_LIMIT} sources.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    Array.from(selectedFiles).forEach((file: File) => {
      const isPdf = file.type === 'application/pdf';
      const isImage = file.type.startsWith('image/');

      if (!isPdf && !isImage) {
        alert(`File ${file.name} is not supported. Please upload PDF or Image.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        const base64Data = base64String.split(',')[1];
        
        setFiles(prev => [...prev, {
          mimeType: file.type,
          data: base64Data,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsSourceModalOpen(false);
  };

  const handleAddYoutube = () => {
    if (!youtubeLink.trim()) return;
    
    if (files.length >= MAX_SOURCE_LIMIT) {
      alert(`Source limit exceeded!`);
      return;
    }

    setFiles(prev => [...prev, {
      mimeType: 'application/x-youtube',
      data: youtubeLink,
      name: 'YouTube Video'
    }]);

    setYoutubeLink('');
    setIsSourceModalOpen(false);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveText = () => {
    if (tempText.trim()) {
      setText(tempText);
      setIsSourceModalOpen(false);
      setModalView('menu');
    }
  };

  // --- HANDLERS: CHAT ---

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatSessionRef.current) return;
    
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      text: chatInput,
      timestamp: Date.now()
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const filesToSend = files.length > 0 ? files : undefined;
      const textContext = text ? `\n\nContext Note: ${text}` : '';
      const finalMessage = userMsg.text + textContext;

      const { text: responseText, sources } = await sendChatMessage(
        chatSessionRef.current, 
        finalMessage, 
        filesToSend
      );

      const aiMsg = {
        id: uuidv4(),
        role: 'model' as const,
        text: responseText,
        timestamp: Date.now(),
        sources
      };

      setChatMessages(prev => [...prev, aiMsg]);
    } catch (e: any) {
      console.error(e);
      let errorText = "I'm having trouble connecting. Please check your internet.";
      if (e.message?.includes('429') || e.message?.toLowerCase().includes('quota')) {
         errorText = "I'm receiving too many requests right now. Please wait a minute and try again.";
      }
      setChatMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'model',
        text: errorText,
        timestamp: Date.now()
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- HANDLERS: GENERATE ---

  const handleGenerate = async (mode: StudyMode) => {
    if (!text.trim() && files.length === 0) return;
    
    // Check cache first
    if (resultsCache[mode]) {
        setGeneratedResult({ mode, content: resultsCache[mode]! });
        return;
    }

    setLoadingMode(mode);
    setError(null);
    try {
      const result = await generateStudyContent(text, mode, files.length > 0 ? files : undefined, language);
      
      // Update Cache
      const newCache = { ...resultsCache, [mode]: result };
      setResultsCache(newCache);
      setGeneratedResult({ mode, content: result });
      
      // Auto-save session with complete state
      saveCurrentSession(newCache);

    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
        setError("Usage limit exceeded. Please wait a moment and try again.");
      } else {
        setError("Something went wrong with the AI request. Please try again.");
      }
    } finally {
      setLoadingMode(null);
    }
  };

  const saveCurrentSession = (currentCache: typeof resultsCache) => {
    const titleText = files.length > 0 
      ? `Analysis of ${files[0].name}${files.length > 1 ? ` + ${files.length - 1} more` : ''}`
      : text.slice(0, 40) + (text.length > 40 ? '...' : 'New Session');

    // Use existing ID if we already created a session in this workflow, otherwise generate new
    const idToUse = currentSessionId || uuidv4();
    if (!currentSessionId) {
      setCurrentSessionId(idToUse);
    }

    const newSession: StudySession = {
      id: idToUse,
      title: titleText,
      date: new Date().toISOString(),
      originalText: text,
      files: files.length > 0 ? files : undefined,
      explanation: currentCache[StudyMode.EXPLAIN],
      summary: currentCache[StudyMode.SUMMARIZE],
      quiz: currentCache[StudyMode.QUIZ],
      flashcards: currentCache[StudyMode.FLASHCARDS],
      chatHistory: chatMessages.length > 1 ? chatMessages : undefined
    };

    saveSession(newSession);
    
    // Logging logic...
    const logContext = text.trim() || (files.length > 0 ? files.map(f => f.name).join(', ') : "");
    if (!chatMessages.length && Object.keys(currentCache).length === 1) {
        // Only log on first generation action to avoid spamming logs
        logActivity('create_session', logContext);
    }
  };

  const isLimitReached = files.length >= MAX_SOURCE_LIMIT;
  const hasContent = text.trim().length > 0 || files.length > 0;
  
  // Define title for display (used in QuizRunner)
  const currentTitle = files.length > 0 
      ? `Analysis of ${files[0].name}${files.length > 1 ? ` + ${files.length - 1} more` : ''}`
      : text.slice(0, 40) + (text.length > 40 ? '...' : 'New Session');

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with Buttons */}
      <div className="flex-shrink-0 mb-6 px-1 lg:px-4 lg:pt-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
             Hello, {user ? 'Student' : 'Guest'}! 👋
           </h1>
           <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Ready to learn? Add your sources below.</p>
        </div>
        <div className="flex items-center gap-2">
           {/* Theme Toggle */}
           <button 
             onClick={onToggleTheme}
             className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
             title="Toggle Theme"
           >
             {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
           </button>
           
           {!user ? (
             <button 
               className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white font-bold shadow-lg hover:scale-105 transition-transform"
               onClick={onAuthRequest}
             >
               <LogIn size={18} />
               <span className="text-sm">Log In / Sign Up</span>
             </button>
           ) : (
             <button 
               className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold shadow-lg shadow-orange-500/20 hover:scale-105 transition-transform"
               onClick={() => alert("Upgrade feature coming soon!")}
             >
               <Crown size={18} fill="currentColor" />
               <span className="text-sm">Upgrade</span>
             </button>
           )}

           {/* Language Selector (Desktop) */}
           <div className="hidden md:flex items-center relative">
              <div className="absolute left-3 text-slate-400 pointer-events-none">
                 <Globe size={16} />
              </div>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
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
               <span className="text-xs font-bold bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-2 py-0.5 rounded-full">{files.length + (text ? 1 : 0)}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Add Source Button */}
                <button 
                    onClick={() => {
                        setTempText(text);
                        setIsSourceModalOpen(true);
                    }}
                    className="w-full py-3 border-2 border-dashed border-indigo-200 dark:border-slate-700 bg-indigo-50/30 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:border-indigo-400 dark:hover:border-slate-600 rounded-xl flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold transition-all mb-4"
                >
                    <Plus size={20} /> Add Source
                </button>

                {/* File List */}
                {files.map((file, idx) => {
                    const isImage = file.mimeType.startsWith('image/');
                    const isYoutube = file.mimeType === 'application/x-youtube';
                    
                    return (
                        <div key={idx} className="relative group bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all p-3 flex items-center gap-3">
                            <div className={`p-2 rounded-lg flex-shrink-0 ${isYoutube ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400'}`}>
                                {isYoutube ? <Youtube size={18} /> : (isImage ? <FileType size={18} /> : <BookOpen size={18} />)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-900 dark:text-slate-200 text-sm truncate">{file.name}</h3>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                                    {isYoutube ? 'Video' : (isImage ? 'Image' : 'PDF')}
                                </p>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}

                {/* Text Note */}
                {text && (
                    <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm p-3 flex items-center gap-3">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 flex-shrink-0">
                            <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-900 dark:text-slate-200 text-sm">Copied Notes</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">{text.length} chars</p>
                        </div>
                        <button 
                            onClick={() => setText('')}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>
            
            {/* Source Limit Footer */}
            <div className="p-4 bg-white/50 dark:bg-slate-900/80 border-t border-gray-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Storage</span>
                    <span className={`text-[10px] font-bold ${isLimitReached ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                        {files.length} / {MAX_SOURCE_LIMIT}
                    </span>
                </div>
                <div className="h-1 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-300 ${isLimitReached ? 'bg-red-500' : 'bg-slate-900 dark:bg-slate-500'}`}
                        style={{ width: `${(files.length / MAX_SOURCE_LIMIT) * 100}%` }}
                    />
                </div>
            </div>
        </div>

        {/* --- CENTER COLUMN: CHAT --- */}
        <div className={`
            flex-col h-full bg-white dark:bg-slate-900 relative z-0 flex-1
            ${activeTab === 'chat' ? 'flex' : 'hidden'} 
            lg:flex
        `}>
            {/* Desktop Header */}
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
                            className={`h-12 text-sm ${resultsCache[StudyMode.EXPLAIN] ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : generatedResult?.mode === StudyMode.EXPLAIN ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                        >
                            Explain {resultsCache[StudyMode.EXPLAIN] && <span className="ml-1 text-[10px]">✓</span>}
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={() => handleGenerate(StudyMode.SUMMARIZE)} 
                            isLoading={loadingMode === StudyMode.SUMMARIZE}
                            className={`h-12 text-sm ${resultsCache[StudyMode.SUMMARIZE] ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : generatedResult?.mode === StudyMode.SUMMARIZE ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                        >
                            Summarize {resultsCache[StudyMode.SUMMARIZE] && <span className="ml-1 text-[10px]">✓</span>}
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={() => handleGenerate(StudyMode.QUIZ)} 
                            isLoading={loadingMode === StudyMode.QUIZ}
                            className={`h-12 text-sm ${resultsCache[StudyMode.QUIZ] ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : generatedResult?.mode === StudyMode.QUIZ ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                        >
                            Quiz {resultsCache[StudyMode.QUIZ] && <span className="ml-1 text-[10px]">✓</span>}
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={() => handleGenerate(StudyMode.FLASHCARDS)} 
                            isLoading={loadingMode === StudyMode.FLASHCARDS}
                            className={`h-12 text-sm ${resultsCache[StudyMode.FLASHCARDS] ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : generatedResult?.mode === StudyMode.FLASHCARDS ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                        >
                            Flashcards {resultsCache[StudyMode.FLASHCARDS] && <span className="ml-1 text-[10px]">✓</span>}
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
                                    title={currentTitle} 
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

      {/* THE WALL MODAL */}
      {isSourceModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4"
          onClick={(e) => {
             if (e.target === e.currentTarget) setIsSourceModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[85vh]">
             <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-3xl z-10">
                <div className="flex items-center gap-2">
                   <div className="p-2 bg-slate-900 dark:bg-slate-800 dark:border dark:border-slate-700 text-white dark:text-slate-200 rounded-lg"><BookOpen size={20} /></div>
                   <span className="font-bold text-slate-900 dark:text-white text-lg">{modalView === 'menu' ? 'Add sources' : 'Paste text'}</span>
                </div>
                <button onClick={() => setIsSourceModalOpen(false)} className="p-2 text-gray-400 hover:text-slate-900 dark:hover:text-white bg-gray-50 dark:bg-slate-800 rounded-full"><X size={20} /></button>
             </div>
             <div className="p-6 overflow-y-auto">
               {modalView === 'menu' && (
                 <div className="space-y-4">
                   <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf,image/*" className="hidden" multiple />
                   
                   {/* 1. File Upload */}
                   <button onClick={() => { if (isLimitReached) { alert("Source limit exceeded."); return; } fileInputRef.current?.click(); }} className="w-full aspect-video border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-2xl flex flex-col items-center justify-center gap-4 transition-all group">
                      <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center text-indigo-500 dark:text-indigo-400 group-hover:scale-110 transition-transform"><Upload size={32} /></div>
                      <div className="text-center"><p className="text-lg font-bold text-slate-700 dark:text-slate-200">Upload sources</p><p className="text-sm text-slate-400">PDF, Images</p></div>
                   </button>
                   
                   {/* 2. YouTube Link Input */}
                   <div className="flex gap-2">
                      <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500">
                          <Youtube size={20} />
                        </div>
                        <input 
                          value={youtubeLink}
                          onChange={(e) => setYoutubeLink(e.target.value)}
                          placeholder="Paste YouTube Link..."
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all dark:text-white"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddYoutube()}
                        />
                      </div>
                      <button 
                        onClick={handleAddYoutube}
                        disabled={!youtubeLink.trim()}
                        className="px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Add
                      </button>
                   </div>

                   {/* 3. Paste Text */}
                   <button onClick={() => setModalView('text')} className="w-full p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl"><Clipboard size={24} /></div>
                      <span className="font-bold text-slate-700 dark:text-slate-200">Paste text</span>
                   </button>
                 </div>
               )}
               {modalView === 'text' && (
                 <div className="space-y-4">
                    <textarea value={tempText} onChange={(e) => setTempText(e.target.value)} placeholder="Paste notes..." className="w-full h-64 p-4 rounded-xl border dark:border-slate-700 bg-gray-50 dark:bg-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 outline-none resize-none" autoFocus />
                    <div className="flex gap-3"><button onClick={() => setModalView('menu')} className="flex-1 py-3 rounded-xl border dark:border-slate-700 font-bold dark:text-slate-200">Back</button><button onClick={handleSaveText} disabled={!tempText.trim()} className="flex-[2] py-3 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white font-bold">Insert</button></div>
                 </div>
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};