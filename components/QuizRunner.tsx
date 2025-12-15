import React, { useState, useEffect } from 'react';
import { QuizItem } from '../types';
import { Button } from './Button';
import { CheckCircle, XCircle, AlertCircle, Save, Check, CircleSlash, HelpCircle } from 'lucide-react';
import { logActivity } from '../services/storageService';

interface QuizRunnerProps {
  content: string; // JSON string from Gemini
  title: string;
  isDark?: boolean;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({ content, title, isDark }) => {
  const [questions, setQuestions] = useState<QuizItem[]>([]);
  const [userAnswers, setUserAnswers] = useState<{[key: number]: string}>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [parseError, setParseError] = useState(false);

  useEffect(() => {
    try {
      // Clean potential Markdown fencing from Gemini response
      const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      if (Array.isArray(parsed)) {
        setQuestions(parsed);
      } else {
        throw new Error("Invalid format");
      }
    } catch (e) {
      console.error("Quiz JSON Parse Error", e);
      setParseError(true);
    }
  }, [content]);

  const handleAnswerChange = (id: number, val: string) => {
    if (isSubmitted) return;
    setUserAnswers(prev => ({ ...prev, [id]: val }));
  };

  const calculateResults = () => {
    let correctCount = 0;
    
    questions.forEach(q => {
      const userAns = userAnswers[q.id]?.trim().toLowerCase();
      const correctAns = q.correctAnswer.toLowerCase();
      
      let isCorrect = false;
      
      // If user hasn't answered, it remains false (incorrect)
      if (userAns) {
        if (q.type === 'mcq') {
          isCorrect = userAns === correctAns;
        } else {
          // For short answers, check if keywords exist or exact match
          if (q.keywords && q.keywords.length > 0) {
             // Loose match: User answer contains most keywords
             const matches = q.keywords.filter(k => userAns?.includes(k.toLowerCase()));
             isCorrect = matches.length >= Math.ceil(q.keywords.length / 2);
          } else {
             isCorrect = userAns === correctAns;
          }
        }
      }
      
      if (isCorrect) correctCount++;
    });

    setScore(correctCount);
    setIsSubmitted(true);

    // Save Data to Profile/Analytics
    logActivity('quiz_complete', `Quiz: ${title}`, {
      total_questions: questions.length,
      correct_answers: correctCount
    });
  };

  if (parseError) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 rounded-xl border border-red-100 dark:border-red-900/30">
        <div className="flex items-center gap-2 mb-2 font-bold">
          <AlertCircle size={20} />
          <span>Format Error</span>
        </div>
        <p className="text-sm">The AI generated a quiz format that we couldn't parse. Please try regenerating the quiz.</p>
        <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg text-xs font-mono overflow-auto max-h-40 text-slate-700 dark:text-slate-400">
           {content}
        </div>
      </div>
    );
  }

  if (questions.length === 0) return <div className="p-8 text-center animate-pulse">Loading Quiz...</div>;

  return (
    <div className="space-y-8">
      {questions.map((q, index) => {
        const userAnswer = userAnswers[q.id];
        const hasAttempted = userAnswer !== undefined && userAnswer !== '';
        
        let isCorrect = false;
        if (isSubmitted && hasAttempted) {
             isCorrect = q.type === 'mcq' 
               ? userAnswer === q.correctAnswer 
               : (q.keywords ? q.keywords.some(k => userAnswer?.toLowerCase().includes(k.toLowerCase())) : userAnswer?.toLowerCase() === q.correctAnswer.toLowerCase());
        }

        return (
          <div key={q.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-50 dark:border-slate-700 flex justify-between items-start gap-4">
              <div className="flex gap-3">
                 <span className="flex-shrink-0 w-6 h-6 bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-slate-300 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                   {index + 1}
                 </span>
                 <h3 className="text-base font-medium text-slate-900 dark:text-white leading-relaxed">
                   {q.question}
                 </h3>
              </div>
              {isSubmitted && (
                 hasAttempted ? (
                   isCorrect 
                     ? <CheckCircle className="text-green-500 flex-shrink-0" size={20} /> 
                     : <XCircle className="text-red-500 flex-shrink-0" size={20} />
                 ) : (
                   <div className="flex items-center gap-1 text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap border border-amber-200 dark:border-amber-800">
                      <CircleSlash size={14} />
                      <span>Not Attempted</span>
                   </div>
                 )
              )}
            </div>

            <div className="p-5 bg-gray-50/50 dark:bg-slate-900/30">
              {q.type === 'mcq' && q.options ? (
                <div className="grid gap-2">
                  {q.options.map(option => {
                    const isSelected = userAnswer === option;
                    const isThisCorrect = option === q.correctAnswer;
                    
                    let btnClass = "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700";
                    
                    if (isSubmitted) {
                      if (isThisCorrect) btnClass = "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-300 ring-1 ring-green-500";
                      else if (isSelected && !isThisCorrect) btnClass = "bg-red-100 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300";
                      else btnClass = "opacity-60 bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700";
                    } else if (isSelected) {
                      btnClass = "bg-indigo-600 border-indigo-600 text-white shadow-md";
                    }

                    return (
                      <button
                        key={option}
                        onClick={() => handleAnswerChange(q.id, option)}
                        disabled={isSubmitted}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all text-sm ${btnClass}`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={userAnswer || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  disabled={isSubmitted}
                  placeholder={isSubmitted && !hasAttempted ? "Not attempted" : "Type your answer here..."}
                  className={`w-full p-3 rounded-lg border bg-white dark:bg-slate-800 outline-none text-sm transition-all ${
                     isSubmitted 
                       ? hasAttempted
                           ? isCorrect 
                              ? 'border-green-500 ring-1 ring-green-500 text-green-700 dark:text-green-300' 
                              : 'border-red-300 text-red-700 dark:text-red-300' 
                           : 'border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800'
                       : 'border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white'
                  }`}
                  rows={2}
                />
              )}

              {/* Feedback Section (Shown after submit) */}
              {isSubmitted && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                   {/* Show Correct Answer if incorrect OR not attempted */}
                   {(!isCorrect || !hasAttempted) && (
                     <div className="mb-2 text-sm">
                       <span className="font-bold text-slate-700 dark:text-slate-300">Correct Answer: </span>
                       <span className="text-green-600 dark:text-green-400 font-medium">{q.correctAnswer}</span>
                     </div>
                   )}
                   <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-sm text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
                     <span className="font-bold">Explanation: </span>
                     {q.explanation}
                   </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Footer / Actions - Static Position */}
      <div className="mt-8 flex justify-center pb-8">
        {!isSubmitted ? (
          <Button 
            onClick={calculateResults} 
            className="shadow-xl shadow-indigo-500/30 px-8 py-3 text-lg"
            icon={<Save size={20} />}
          >
            Submit Quiz
          </Button>
        ) : (
          <div className="bg-slate-900 dark:bg-slate-800 text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-4 animate-in zoom-in-95">
             <div className="flex flex-col">
               <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Your Score</span>
               <span className="text-2xl font-bold leading-none">{score} / {questions.length}</span>
             </div>
             <div className="h-8 w-px bg-white/20"></div>
             <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <Check size={16} /> Results Saved
             </div>
          </div>
        )}
      </div>
    </div>
  );
};