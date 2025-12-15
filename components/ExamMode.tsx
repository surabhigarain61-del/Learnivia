import React, { useState, useEffect } from 'react';
import { StudySession, ExamItem, StudyEvent } from '../types';
import { getSessions, logActivity, getActivities } from '../services/storageService';
import { generateExam } from '../services/geminiService';
import { Button } from './Button';
import { GraduationCap, ArrowRight, BookOpen, RefreshCcw, ArrowLeft, PenTool, CheckCircle, XCircle, AlertCircle, FileText, History, Save, Check, Home, Loader2 } from 'lucide-react';

interface ExamModeProps {
  language: string;
}

export const ExamMode: React.FC<ExamModeProps> = ({ language }) => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Select, 2: Configure, 3: Exam
  const [totalMarks, setTotalMarks] = useState<number>(20);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // History State
  const [examHistory, setExamHistory] = useState<StudyEvent[]>([]);

  // Exam State
  const [examData, setExamData] = useState<ExamItem[]>([]);
  const [userAnswers, setUserAnswers] = useState<{[key: number]: string}>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<{[key: number]: boolean}>({});
  const [isFinished, setIsFinished] = useState(false);
  
  useEffect(() => {
    const init = async () => {
      setInitializing(true);
      const s = await getSessions();
      setSessions(s);
      await loadHistory();
      setInitializing(false);
    };
    init();
  }, []);

  const loadHistory = async () => {
    const allEvents = await getActivities();
    const history = allEvents
      .filter(e => e.action_type === 'exam_complete')
      .sort((a, b) => b.timestamp - a.timestamp); // Newest first
    setExamHistory(history);
  };

  const toggleSession = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleGenerateExam = async () => {
    setLoading(true);
    setError(null);
    setStep(3);
    setIsFinished(false);
    setUserAnswers({});
    setSubmittedQuestions({});
    
    const selectedSessions = sessions.filter(s => selectedIds.has(s.id));
    
    try {
      const content = await generateExam(selectedSessions, totalMarks, language);
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          setExamData(parsed);
        } else {
          throw new Error("Invalid format");
        }
      } catch (parseError) {
        console.error("JSON Parse Error", parseError);
        setError("Failed to process exam data. Please try again.");
      }
    } catch (e) {
      console.error(e);
      setError("We couldn't generate the exam. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const resetExam = async () => {
    setStep(1);
    setSelectedIds(new Set());
    setExamData([]);
    setUserAnswers({});
    setSubmittedQuestions({});
    setIsFinished(false);
    setError(null);
    await loadHistory();
  };

  const handleAnswerChange = (id: number, val: string) => {
    if (!isFinished) {
      setUserAnswers(prev => ({ ...prev, [id]: val }));
    }
  };

  const checkAnswer = (id: number) => {
    if (!userAnswers[id] || isFinished) return;
    setSubmittedQuestions(prev => ({ ...prev, [id]: true }));
  };

  const isCorrect = (q: ExamItem) => {
    const ans = userAnswers[q.id]?.trim().toLowerCase();
    if (!ans) return false;

    if (q.type === 'mcq') {
      return ans === q.correctAnswer?.toLowerCase();
    }
    
    if (q.type === 'fill_blank') {
       return ans === q.correctAnswer?.toLowerCase();
    }
    
    if (q.type === 'short_answer' || q.type === 'long_answer') {
      if (!q.keywords) return true; // Loose grading
      // Check for at least 50% keyword match
      const hits = q.keywords.reduce((acc, k) => ans.includes(k.toLowerCase()) ? acc + 1 : acc, 0);
      return hits >= Math.ceil(q.keywords.length / 2);
    }
    
    return false;
  };

  const getCurrentScore = () => {
    return examData.reduce((score, q) => {
      // Only count if submitted or exam is finished
      if ((submittedQuestions[q.id] || isFinished) && isCorrect(q)) {
        return score + q.marks;
      }
      return score;
    }, 0);
  };

  const finishExam = async () => {
    if (isFinished) return;

    // 1. Mark all as submitted so users see results
    const allSubmitted: {[key: number]: boolean} = {};
    examData.forEach(q => allSubmitted[q.id] = true);
    setSubmittedQuestions(allSubmitted);
    setIsFinished(true);

    // 2. Calculate final score
    const finalScore = examData.reduce((score, q) => {
       const ans = userAnswers[q.id]?.trim().toLowerCase();
       if (!ans) return score;
       
       let correct = false;
       if (q.type === 'mcq') correct = ans === q.correctAnswer?.toLowerCase();
       else if (q.type === 'fill_blank') correct = ans === q.correctAnswer?.toLowerCase();
       else if ((q.type === 'short_answer' || q.type === 'long_answer') && q.keywords) {
         const hits = q.keywords.reduce((acc, k) => ans.includes(k.toLowerCase()) ? acc + 1 : acc, 0);
         correct = hits >= Math.ceil(q.keywords.length / 2);
       }
       
       return correct ? score + q.marks : score;
    }, 0);

    // 3. Determine Subject Name
    const selectedSessions = sessions.filter(s => selectedIds.has(s.id));
    let subjectName = "General Knowledge";
    if (selectedSessions.length === 1) {
      subjectName = selectedSessions[0].title;
    } else if (selectedSessions.length > 1) {
      subjectName = `${selectedSessions[0].title} + ${selectedSessions.length - 1} others`;
    }

    // 4. Log to Storage
    await logActivity('exam_complete', 'Completed Exam Mode', {
      exam_score: finalScore,
      exam_total: totalMarks,
      exam_subject: subjectName
    });

    // 5. Refresh History
    await loadHistory();
  };

  if (initializing) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-500" /></div>;
  }

  // Step 1: Selection & History
  if (step === 1) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl">
               <GraduationCap size={24} />
             </div>
             <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Exam Mode</h1>
           </div>
           <p className="text-gray-600 dark:text-slate-400">
             Combine topics for a comprehensive mock exam. Select sessions below.
           </p>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-300 dark:border-slate-700">
             <p className="text-gray-500 dark:text-slate-400">No study sessions found.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {sessions.map((session) => {
              const isSelected = selectedIds.has(session.id);
              return (
                <div 
                  key={session.id}
                  onClick={() => toggleSession(session.id)}
                  className={`
                    cursor-pointer p-5 rounded-xl border transition-all
                    ${isSelected 
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 dark:border-indigo-400 shadow-md ring-1 ring-indigo-500 dark:ring-indigo-400' 
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-500'}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div className="overflow-hidden">
                       <h3 className={`font-bold truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>
                         {session.title || 'Untitled'}
                       </h3>
                       <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                         <BookOpen size={12} /> {new Date(session.date).toLocaleDateString()}
                       </p>
                    </div>
                    {isSelected && <CheckCircle size={20} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end mt-8">
          <Button onClick={() => setStep(2)} disabled={selectedIds.size === 0} className="shadow-xl">
            Next: Configure <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>

        {/* Section 2: Exam History */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-slate-800">
           <div className="flex items-center gap-2 mb-6">
              <History size={20} className="text-slate-600 dark:text-slate-300" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Exam History</h2>
           </div>

           {examHistory.length === 0 ? (
             <div className="text-center py-8 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                <p className="text-gray-500 dark:text-slate-400 text-sm">No exams taken yet. Start your first exam above!</p>
             </div>
           ) : (
             <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600 text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                        <th className="px-6 py-4">Subject</th>
                        <th className="px-6 py-4">Score</th>
                        <th className="px-6 py-4">Accuracy</th>
                        <th className="px-6 py-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                      {examHistory.map((exam) => {
                        const score = exam.exam_score || 0;
                        const total = exam.exam_total_marks || 1;
                        const percentage = Math.round((score / total) * 100);
                        
                        return (
                          <tr key={exam.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                  <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                                    {exam.exam_subject || "General Exam"}
                                  </span>
                               </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                               {score} <span className="text-gray-400 dark:text-slate-500">/ {total}</span>
                            </td>
                            <td className="px-6 py-4">
                               <span className={`
                                 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold
                                 ${percentage >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 
                                   percentage >= 50 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : 
                                   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}
                               `}>
                                 {percentage}%
                               </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                               {new Date(Number(exam.timestamp)).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
             </div>
           )}
        </div>
      </div>
    );
  }

  // Step 2: Configure
  if (step === 2) {
    return (
      <div className="max-w-xl mx-auto pt-10">
        <button onClick={() => setStep(1)} className="text-gray-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-6 flex items-center text-sm">
          <ArrowLeft size={16} className="mr-1" /> Back
        </button>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700">
           <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
             <PenTool size={24} />
           </div>
           <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Exam Setup</h2>
           <p className="text-gray-600 dark:text-slate-400 mb-8">Selected {selectedIds.size} topics.</p>

           <div className="mb-8">
             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Total Marks</label>
             <div className="flex items-center gap-4">
               <input 
                 type="range" min="10" max="50" step="5"
                 value={totalMarks}
                 onChange={(e) => setTotalMarks(parseInt(e.target.value))}
                 className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
               />
               <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 w-16 text-center">{totalMarks}</span>
             </div>
           </div>

           <Button onClick={handleGenerateExam} className="w-full py-3 text-lg" isLoading={loading}>
             Start Exam
           </Button>
        </div>
      </div>
    );
  }

  // Step 3: Exam Interface
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto text-center pt-20">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-gray-100 dark:border-slate-800 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
          <GraduationCap className="absolute inset-0 m-auto text-indigo-500" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Generating Exam...</h2>
        <p className="text-gray-500 dark:text-slate-400 animate-pulse">Designing questions based on your notes in {language}.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto pt-20 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-2xl mb-6">
          <AlertCircle size={48} className="mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Error</h3>
          <p>{error}</p>
        </div>
        <Button onClick={resetExam} variant="outline">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-gray-50 dark:bg-slate-900 py-4 z-10 backdrop-blur-sm transition-colors duration-300">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="text-indigo-600 dark:text-indigo-400" /> Comprehensive Exam
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
             Current Score: <span className="font-bold text-slate-900 dark:text-white">{getCurrentScore()}</span> / {totalMarks}
          </p>
        </div>
        <div className="flex items-center gap-2">
           {!isFinished && (
             <Button variant="primary" onClick={finishExam} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
               <Save size={16} className="mr-2" /> Finish Exam
             </Button>
           )}
           <Button variant="outline" onClick={resetExam} size="sm" className="dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-800">
             <RefreshCcw size={16} className="mr-2" /> Restart
           </Button>
        </div>
      </div>

      <div className="space-y-8">
        {examData.map((q, idx) => {
          // If exam is finished, show result for all. If not, only for submitted.
          const isSubmitted = submittedQuestions[q.id] || isFinished;
          const correct = isCorrect(q);

          return (
            <div key={q.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-gray-50 dark:border-slate-700 flex justify-between items-start">
                 <div className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-medium text-slate-900 dark:text-white">{q.question}</h3>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded uppercase">
                          {q.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded uppercase">
                          {q.marks} Mark{q.marks > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                 </div>
                 {isSubmitted && (
                   correct 
                    ? <CheckCircle className="text-green-500" size={24} /> 
                    : <XCircle className="text-red-500" size={24} />
                 )}
              </div>

              <div className="p-6 bg-gray-50/50 dark:bg-slate-900/50">
                {/* MCQ */}
                {q.type === 'mcq' && q.options && (
                  <div className="grid gap-3">
                    {q.options.map((opt) => {
                      const selected = userAnswers[q.id] === opt;
                      const isRight = opt === q.correctAnswer;
                      
                      let style = "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 dark:text-white";
                      if (isSubmitted) {
                        if (isRight) style = "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-300";
                        else if (selected && !isRight) style = "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-300";
                        else style = "opacity-50 dark:opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400";
                      } else if (selected) {
                        style = "bg-slate-900 dark:bg-indigo-600 border-slate-900 dark:border-indigo-600 text-white";
                      }

                      return (
                        <button
                          key={opt}
                          onClick={() => handleAnswerChange(q.id, opt)}
                          disabled={isFinished}
                          className={`w-full text-left p-4 rounded-xl border transition-all ${style}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Fill Blank */}
                {q.type === 'fill_blank' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userAnswers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      disabled={isFinished}
                      placeholder="Type the missing word..."
                      className="flex-1 p-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 outline-none"
                    />
                  </div>
                )}

                {/* Text Answers */}
                {(q.type === 'short_answer' || q.type === 'long_answer') && (
                  <textarea
                    value={userAnswers[q.id] || ''}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    disabled={isFinished}
                    placeholder="Type your answer here..."
                    rows={q.type === 'long_answer' ? 5 : 2}
                    className="w-full p-4 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500 outline-none resize-none"
                  />
                )}

                {/* Submit / Feedback */}
                <div className="mt-4 flex justify-end">
                   {!isSubmitted ? (
                     <Button 
                       onClick={() => checkAnswer(q.id)} 
                       disabled={!userAnswers[q.id]}
                       size="sm"
                     >
                       Check Answer
                     </Button>
                   ) : (
                     <div className="w-full">
                       {!correct && (
                         <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-red-100 dark:border-red-900/30 mb-2 animate-in fade-in">
                           <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">Correct Answer:</p>
                           <p className="text-slate-800 dark:text-slate-200">
                             {q.correctAnswer || q.modelAnswer}
                           </p>
                         </div>
                       )}
                       <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                         <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-1">Explanation:</p>
                         <p className="text-sm text-indigo-700 dark:text-indigo-200">{q.explanation}</p>
                       </div>
                     </div>
                   )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Footer / Completion Banner */}
      <div className="mt-8 pb-8">
        {!isFinished ? (
           <Button onClick={finishExam} className="w-full py-4 text-lg bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200 dark:shadow-none">
             Finish & Submit Exam
           </Button>
        ) : (
          <div className="p-8 bg-slate-900 dark:bg-slate-800 rounded-2xl text-center text-white animate-in slide-in-from-bottom-4 shadow-xl border dark:border-slate-700">
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle className="text-green-400" />
              <h2 className="text-2xl font-bold">Exam Completed!</h2>
            </div>
            <p className="text-lg opacity-80 mb-6">You scored {getCurrentScore()} out of {totalMarks}</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm text-indigo-100 mb-6">
              <Check size={14} /> Results saved successfully to history & analytics.
            </div>
            <div className="block">
              <Button 
                onClick={resetExam} 
                variant="secondary"
                className="bg-indigo-600 text-white hover:bg-indigo-500 border-none px-6"
                icon={<Home size={18} />}
              >
                Back to Exam Menu
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};