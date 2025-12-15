import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, StudyFile } from '../types';
import { createChatSession, sendChatMessage } from '../services/geminiService';
import { logActivity } from '../services/storageService';
import { Chat } from '@google/genai';
import { Button } from './Button';
import { Send, User, Sparkles, Paperclip, X, Image as ImageIcon, ExternalLink, Globe } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { v4 as uuidv4 } from 'uuid';

interface ChatInterfaceProps {
  language: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ language }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [attachedImages, setAttachedImages] = useState<StudyFile[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize chat session on mount
    const chat = createChatSession(language);
    setChatSession(chat);
    
    // Initial welcome message
    setMessages([{
      id: 'init',
      role: 'model',
      text: "Hello. I am Learnivia. \n\nI can help you break down complex topics, analyze images, or search the web for the latest study resources. What shall we focus on today?",
      timestamp: Date.now()
    }]);
  }, [language]); // Re-create session if language changes

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        const base64Data = base64String.split(',')[1]; // Remove data URL prefix
        
        setAttachedImages(prev => [...prev, {
          mimeType: file.type,
          data: base64Data,
          name: file.name
        }]);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && attachedImages.length === 0) || !chatSession) return;
    
    // Create User Message
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
      images: attachedImages.map(img => `data:${img.mimeType};base64,${img.data}`)
    };
    
    const imagesToSend = [...attachedImages]; // Capture current images
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachedImages([]);
    setIsLoading(true);

    // Log Activity
    logActivity('chat', userMsg.text);

    try {
      const { text, sources } = await sendChatMessage(chatSession, userMsg.text, imagesToSend);
      
      const aiMsg: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        text: text,
        timestamp: Date.now(),
        sources: sources
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
      const errorMsg: ChatMessage = {
        id: uuidv4(),
        role: 'model',
        text: "I am experiencing a connection issue. Please verify your network and try again.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-100px)] flex flex-col bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden relative group">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-slate-950/80 backdrop-blur-xl p-4 border-b border-white/5 flex items-center gap-4">
        <div className="p-2.5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl border border-white/10 shadow-[0_0_15px_-3px_rgba(99,102,241,0.15)]">
           <Sparkles size={20} className="text-indigo-400" />
        </div>
        <div>
           <h2 className="font-bold text-slate-100 tracking-tight">Learnivia Tutor</h2>
           <p className="text-xs text-slate-400 font-medium flex items-center gap-2">
             <Globe size={10} className="text-emerald-500" /> Speaking {language}
           </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 relative z-10 scroll-smooth" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            
            {/* Avatar */}
            <div className={`
              flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border shadow-lg
              ${msg.role === 'user' 
                ? 'bg-slate-800 border-slate-700 text-slate-400' 
                : 'bg-gradient-to-br from-indigo-600 to-purple-600 border-transparent text-white shadow-indigo-500/20'}
            `}>
              {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
            </div>
            
            {/* Bubble */}
            <div className={`
              max-w-[85%] md:max-w-[75%] rounded-2xl p-5 text-sm leading-relaxed shadow-sm flex flex-col gap-3
              ${msg.role === 'user' 
                ? 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tr-sm' 
                : 'bg-slate-900/90 backdrop-blur-sm text-slate-200 border border-indigo-500/20 shadow-[0_0_20px_-5px_rgba(99,102,241,0.1)] rounded-tl-sm'}
            `}>
              {/* Images in User Message */}
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {msg.images.map((imgSrc, idx) => (
                    <img 
                      key={idx} 
                      src={imgSrc} 
                      alt="Attachment" 
                      className="h-32 w-auto rounded-lg border border-white/10 object-cover"
                    />
                  ))}
                </div>
              )}

              {/* Text Content */}
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              ) : (
                <MarkdownRenderer content={msg.text} isDark={true} />
              )}

              {/* Sources (Grounding) */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-3 border-t border-white/10">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1">
                    <Globe size={10} /> Sources
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((source, idx) => source.web ? (
                      <a 
                        key={idx} 
                        href={source.web.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-indigo-500/30 rounded-lg transition-all group text-xs text-indigo-300 max-w-[200px]"
                      >
                         <span className="truncate">{source.web.title}</span>
                         <ExternalLink size={10} className="opacity-50 group-hover:opacity-100" />
                      </a>
                    ) : null)}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex gap-4">
             <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white border border-transparent shadow-lg shadow-indigo-500/20">
               <Sparkles size={14} />
             </div>
             <div className="bg-slate-900/90 border border-indigo-500/20 p-4 rounded-2xl rounded-tl-sm shadow-[0_0_20px_-5px_rgba(99,102,241,0.1)]">
                <div className="flex gap-1.5 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></span>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-950 border-t border-white/5 relative z-10">
        
        {/* Attachment Preview */}
        {attachedImages.length > 0 && (
          <div className="flex gap-3 mb-3 px-2 overflow-x-auto">
            {attachedImages.map((file, idx) => (
              <div key={idx} className="relative group">
                <div className="h-16 w-16 rounded-lg overflow-hidden border border-indigo-500/50">
                  <img 
                    src={`data:${file.mimeType};base64,${file.data}`} 
                    className="h-full w-full object-cover" 
                    alt="preview" 
                  />
                </div>
                <button 
                  onClick={() => removeAttachment(idx)}
                  className="absolute -top-1.5 -right-1.5 bg-slate-900 text-slate-400 hover:text-red-400 rounded-full p-0.5 border border-white/10 shadow-sm"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-center gap-2 max-w-4xl mx-auto">
          {/* File Upload Button */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl bg-slate-900/50 border border-white/10 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all flex-shrink-0"
            title="Upload Image"
          >
            <Paperclip size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*" 
            className="hidden" 
          />

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={attachedImages.length > 0 ? "Ask about this image..." : `Ask a question in ${language}...`}
            className="w-full pl-5 pr-14 py-4 bg-slate-900/50 border border-white/10 rounded-2xl text-slate-200 placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:outline-none resize-none transition-all shadow-inner"
            rows={1}
            style={{ minHeight: '56px', maxHeight: '120px' }}
          />
          <button 
            onClick={handleSend} 
            disabled={(!input.trim() && attachedImages.length === 0) || isLoading}
            className="absolute right-2 top-2 bottom-2 aspect-square rounded-xl flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-900/50 hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all duration-200"
          >
            <Send size={20} />
          </button>
        </div>
        <div className="text-center mt-3 flex items-center justify-center gap-2">
          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold">AI Assistant</p>
          <span className="text-[10px] text-slate-700">•</span>
          <p className="text-[10px] text-emerald-500/70 font-medium flex items-center gap-1"><Globe size={8} /> Search Enabled</p>
        </div>
      </div>
    </div>
  );
};