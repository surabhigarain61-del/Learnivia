import React, { useState, useEffect } from 'react';
import { StudySession } from '../types';
import { getSessions, saveSession } from '../services/storageService';
import { generateRevision } from '../services/geminiService';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Button } from './Button';
import { Zap, Clock, ArrowLeft, RefreshCw, CheckCircle, History, Calendar, Loader2 } from 'lucide-react';

interface QuickRevisionProps {
  isDarkMode?: boolean;
  language: string;
}

export const QuickRevision: React.FC<QuickRevisionProps> = ({ isDarkMode = false, language }) => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [revisionContent, setRevisionContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setInitializing(true);
    const data = await getSessions();
    setSessions(data);
    setInitializing(false);
  };

  const handleSelectSession = async (session: StudySession) => {
    setSelectedSession(session);
    
    // Check if revision already exists
    if (session.revisionGuide) {
      setRevisionContent(session.revisionGuide);
      return;
    }

    // If not, generate new
    setLoading(true);
    try {
      const content = await generateRevision(session, language);
      setRevisionContent(content);
      
      // Save to session
      const updatedSession = { 
        ...session, 
        revisionGuide: content, 
        lastRevisionDate: new Date().toISOString() 
      };
      await saveSession(updatedSession);
      
      // Update local state to reflect changes immediately
      setSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s));
      setSelectedSession(updatedSession);
      
    } catch (e) {
      console.error(e);
      setRevisionContent("Sorry, we couldn't generate a revision guide at this moment. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleRegenerate = async () => {
    if (!selectedSession) return;
    
    setLoading(true);
    try {
      const content = await generateRevision(selectedSession, language);
      setRevisionContent(content);
      
      // Save updated revision
      const updatedSession = { 
        ...selectedSession, 
        revisionGuide: content, 
        lastRevisionDate: new Date().toISOString() 
      };
      await saveSession(updatedSession);
      
      setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
      setSelectedSession(updatedSession);
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedSession(null);
    setRevisionContent(null);
    loadSessions(); // Refresh list to ensure order/data is correct
  };

  if (initializing) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  // Filter sessions that have revision history
  const revisedSessions = sessions.filter(s => s.revisionGuide && s.lastRevisionDate)
    .sort((a, b) => new Date(b.lastRevisionDate!).getTime() - new Date(a.lastRevisionDate!).getTime());

  // View 1: List Selection
  if (!selectedSession) {
    return (
      <div className="max-w-4xl mx-auto pb-12">
        <div className="mb-8 text-center">
           <div className="inline-flex items-center justify-center p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full mb-4">
              <Zap size={32} />
           </div>
           <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Quick Revision</h1>
           <p className="text-gray-600 dark:text-slate-400 max-w-lg mx-auto">
             Select a past study session to generate or view a high-impact revision guide.
           </p>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
             <p className="text-gray-500 dark:text-slate-400">No study sessions found. Go create one first!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
               <Zap size={20} className="text-amber-500" />
               <h2 className="text-xl font-bold text-slate-900 dark:text-white">Start New Revision</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-12">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  className="text-left group bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-500 hover:ring-2 hover:ring-amber-100 dark:hover:ring-amber-900/30 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors pr-4">
                      {session.title || 'Untitled Session'}
                    </h3>
                    {session.revisionGuide && (
                      <span className="shrink-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle size={10} /> READY
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Clock size={14} /> {new Date(session.date).toLocaleDateString()}</span>
                    <div className="flex gap-1">
                      {session.explanation && <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">Exp</span>}
                      {session.quiz && <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded">Quiz</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Revision History Section */}
            {revisedSessions.length > 0 && (
              <div className="pt-8 border-t border-gray-200 dark:border-slate-700">
                 <div className="flex items-center gap-2 mb-6">
                    <History size={20} className="text-slate-600 dark:text-slate-300" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Revision History</h2>
                 </div>

                 <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600 text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                            <th className="px-6 py-4">Session Topic</th>
                            <th className="px-6 py-4">Created Date</th>
                            <th className="px-6 py-4">Last Revised</th>
                            <th className="px-6 py-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                          {revisedSessions.map((session) => (
                            <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" onClick={() => handleSelectSession(session)}>
                              <td className="px-6 py-4">
                                 <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px] block">
                                   {session.title || 'Untitled'}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                                 <div className="flex items-center gap-2">
                                    <Clock size={14} />
                                    {new Date(session.date).toLocaleDateString()}
                                 </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                                 <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium">
                                    <Calendar size={14} />
                                    {session.lastRevisionDate ? new Date(session.lastRevisionDate).toLocaleDateString() : '-'}
                                 </div>
                              </td>
                              <td className="px-6 py-4">
                                 <Button size="sm" variant="secondary" className="h-8 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700">
                                   Open Guide
                                 </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                 </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // View 2: Loading State
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center pt-20">
        <div className="relative w-24 h-24 mx-auto mb-8">
           <div className="absolute inset-0 border-4 border-gray-100 dark:border-slate-800 rounded-full"></div>
           <div className="absolute inset-0 border-4 border-amber-500 rounded-full border-t-transparent animate-spin"></div>
           <Zap className="absolute inset-0 m-auto text-amber-500" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Analyzing "{selectedSession?.title}"</h2>
        <p className="text-gray-500 dark:text-slate-400 animate-pulse">Synthesizing notes, quizzes, and summaries in {language}...</p>
      </div>
    );
  }

  // View 3: Revision Content
  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-gray-50/90 dark:bg-slate-900/90 backdrop-blur-sm py-4 z-10 transition-colors duration-300">
        <button 
          onClick={handleBack}
          className="flex items-center text-gray-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={20} className="mr-1" /> Back to Selection
        </button>
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full text-sm font-medium border border-amber-100 dark:border-amber-800/50">
             <Zap size={14} /> Quick Revision Mode
           </div>
           <Button onClick={handleRegenerate} size="sm" variant="outline" className="dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800" icon={<RefreshCw size={14} />}>
             Regenerate
           </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
         <div className="p-8 border-b border-gray-100 dark:border-slate-700 bg-gradient-to-r from-amber-50/50 to-white dark:from-slate-800 dark:to-slate-800">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Revision: {selectedSession?.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
               <span className="flex items-center gap-1">
                 <CheckCircle size={16} className="text-green-500" />
                 Generated from study data
               </span>
               {selectedSession?.lastRevisionDate && (
                 <span className="flex items-center gap-1 text-gray-400 dark:text-slate-500">
                    <Clock size={14} /> Revised: {new Date(selectedSession.lastRevisionDate).toLocaleDateString()}
                 </span>
               )}
            </div>
         </div>
         
         <div className="p-8 dark:text-slate-300">
            <MarkdownRenderer content={revisionContent || ""} isDark={isDarkMode} />
         </div>
         
         <div className="bg-gray-50 dark:bg-slate-900/50 p-6 text-center border-t border-gray-100 dark:border-slate-700">
            <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">Done with this topic?</p>
            <Button onClick={handleBack} variant="outline" className="dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800" icon={<RefreshCw size={16} />}>
               Revise Another Topic
            </Button>
         </div>
      </div>
    </div>
  );
};