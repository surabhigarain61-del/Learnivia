import React from 'react';
import { StudySession } from '../types';
import { getSessions, deleteSession } from '../services/storageService';
import { Button } from './Button';
import { Clock, ChevronRight, Trash2, FileText, Loader2 } from 'lucide-react';

interface SavedNotesProps {
  onOpenSession: (session: StudySession) => void;
}

export const SavedNotes: React.FC<SavedNotesProps> = ({ onOpenSession }) => {
  const [sessions, setSessions] = React.useState<StudySession[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    const data = await getSessions();
    setSessions(data);
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this session?')) {
      await deleteSession(id);
      loadSessions(); // Reload list
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Your Saved Sessions</h1>
      
      {sessions.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-full w-fit mx-auto mb-4">
             <FileText size={32} className="text-gray-400 dark:text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No saved notes yet</h3>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Start a new study session to see it here.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div 
              key={session.id}
              onClick={() => onOpenSession(session)}
              className="group bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate pr-4">
                  {session.title || 'Untitled Session'}
                </h3>
                <div className="flex items-center text-sm text-gray-500 dark:text-slate-400 mt-1">
                  <Clock size={14} className="mr-1" />
                  {formatDate(session.date)}
                  <span className="mx-2">•</span>
                  <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-xs font-medium">
                    {session.quiz ? 'Quiz' : session.explanation ? 'Explanation' : 'Notes'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => handleDelete(e, session.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
                <div className="p-2 text-indigo-600 dark:text-indigo-400">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};