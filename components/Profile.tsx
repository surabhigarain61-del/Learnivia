import React, { useEffect, useState } from 'react';
import { MOCK_USER } from '../constants';
import { Button } from './Button';
import { User, Shield, Zap, Check, Flame, Trophy, Clock, BookOpen, Brain, TrendingUp, Activity, Target, BarChart2, Calendar, FileText, Calculator, Loader2, LogIn, AlertTriangle } from 'lucide-react';
import { getUserStats } from '../services/storageService';
import { generateProgressInsights } from '../services/geminiService';
import { UserStats } from '../types';
import { supabase } from '../services/supabase';

interface ProfileProps {
  user?: any;
  onAuthRequest?: () => void;
}

const EMPTY_STATS: UserStats = {
  totalSessions: 0,
  sessionsToday: 0,
  sessionsThisWeek: 0,
  sessionsThisMonth: 0,
  totalTimeMinutes: 0,
  studyTimeToday: 0,
  studyTimeThisWeek: 0,
  quizzesGenerated: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastSevenDays: [],
  quizAccuracy: 0,
  totalQuizQuestions: 0,
  totalQuizCorrect: 0,
  totalQuizzesTaken: 0,
  totalExamsTaken: 0,
  examAverageAccuracy: 0,
  examAverageScore: 0,
  examBestScore: 0,
  topTopics: []
};

export const Profile: React.FC<ProfileProps> = ({ user, onAuthRequest }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [userEmail, setUserEmail] = useState(user?.email || "Guest User");

  useEffect(() => {
    // If guest, show empty stats immediately
    if (!user) {
      setStats(EMPTY_STATS);
      return;
    }

    setUserEmail(user.email);

    const loadData = async () => {
      try {
        const data = await getUserStats();
        setStats(data);

        // Generate insights if we have data
        if (data && data.totalSessions > 0) {
          setLoadingInsights(true);
          generateProgressInsights(data)
            .then(text => setInsights(text))
            .catch(err => console.error(err))
            .finally(() => setLoadingInsights(false));
        }
      } catch (e) {
        console.error("Failed to load user stats", e);
        setStats(EMPTY_STATS);
      }
    };
    
    loadData();
  }, [user]);

  const formatTime = (minutes: number) => {
    if (minutes === undefined || minutes === null) return "0m";
    if (minutes < 60) return `${minutes}m`;
    return `${(minutes / 60).toFixed(1)}h`;
  };

  if (!stats) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Profile & Analytics</h1>

      {/* Guest Warning Banner */}
      {!user && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4 mb-8 flex flex-col sm:flex-row items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-full text-amber-600 dark:text-amber-400 flex-shrink-0">
             <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
             <h3 className="font-bold text-amber-800 dark:text-amber-300 text-base">Unsaved Progress</h3>
             <p className="text-amber-700 dark:text-amber-400 text-sm mt-1 leading-relaxed">
               You are currently in Guest Mode. Your study analytics, sessions, and streaks are <strong>not being saved</strong> to the cloud. Log in to track your progress permanently.
             </p>
          </div>
          <Button size="sm" onClick={onAuthRequest} className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-200 dark:bg-amber-800 dark:text-amber-100 dark:border-amber-700 dark:hover:bg-amber-700 whitespace-nowrap">
             <LogIn className="w-4 h-4 mr-2" /> Log In / Sign Up
          </Button>
        </div>
      )}

      {/* Top Section Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* User Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:from-indigo-900 dark:to-slate-800 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
            <User size={32} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user ? 'Student User' : 'Guest Student'}</h2>
            <p className="text-gray-500 dark:text-slate-400 text-sm">{user ? userEmail : 'Not logged in'}</p>
            <span className="inline-flex mt-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300">
              {user ? MOCK_USER.plan : 'Guest'} Plan
            </span>
          </div>
        </div>

        {/* Upgrade Card */}
        <div className="bg-slate-900 dark:bg-black rounded-2xl p-6 text-white relative overflow-hidden flex flex-col justify-center border dark:border-slate-800">
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg mb-1">Go Pro</h3>
              <p className="text-slate-300 text-sm mb-3">Unlock advanced models & unlimited stats.</p>
              <button className="text-xs bg-white text-slate-900 px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Upgrade ($5/mo)
              </button>
            </div>
            <Shield size={48} className="text-indigo-400 opacity-80" />
          </div>
          <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
        </div>
      </div>

      {/* Activity Overview */}
      <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
        <TrendingUp size={20} className="text-indigo-600 dark:text-indigo-400" /> Study Overview
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {/* Total Time Card */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 mb-2">
            <Clock size={16} className="text-amber-500" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Time</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatTime(stats.totalTimeMinutes)}</p>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
               {formatTime(stats.studyTimeToday)} today
             </span>
             <span className="text-xs text-gray-400">
               {formatTime(stats.studyTimeThisWeek)} week
             </span>
          </div>
        </div>

        {/* Sessions Card */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 mb-2">
            <Activity size={16} className="text-blue-500" />
            <span className="text-xs font-medium uppercase tracking-wider">Sessions</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalSessions}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.sessionsToday} today</p>
        </div>

        {/* Streak Card */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 mb-2">
            <Flame size={16} className="text-orange-500" />
            <span className="text-xs font-medium uppercase tracking-wider">Streak</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.currentStreak} <span className="text-sm font-normal text-gray-400">days</span></p>
          <p className="text-xs text-gray-400 mt-1">Best: {stats.longestStreak}</p>
        </div>

        {/* Quizzes Generated Card */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 mb-2">
            <Trophy size={16} className="text-purple-500" />
            <span className="text-xs font-medium uppercase tracking-wider">Quizzes</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.quizzesGenerated}</p>
          <p className="text-xs text-gray-400 mt-1">Generated</p>
        </div>
      </div>

      {/* Study Consistency Chart */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm mb-8">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
           <Calendar size={16} className="text-indigo-500" />
           Study Consistency <span className="text-gray-400 font-normal text-xs">(Last 7 Days)</span>
        </h4>
        <div className="flex items-end justify-between gap-2 h-24">
           {stats.lastSevenDays && stats.lastSevenDays.length > 0 ? (
             stats.lastSevenDays.map((day, idx) => (
               <div key={idx} className="flex flex-col items-center gap-2 flex-1 group">
                  <div 
                     className={`w-full rounded-md transition-all duration-500 relative ${day.studied ? 'bg-indigo-500 h-16' : 'bg-gray-100 dark:bg-slate-700 h-full'}`}
                     style={{ height: day.studied ? '100%' : '15%' }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                       {new Date(day.date).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold ${day.studied ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-600'}`}>
                    {day.day}
                  </span>
               </div>
             ))
           ) : (
             <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No data available</div>
           )}
        </div>
      </div>

      {/* Main Content Grid: Quiz Performance & Exam Analytics */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
         {/* Quiz Accuracy & Performance Section */}
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Target size={20} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Quiz Performance</h3>
            </div>
            
            <div className="flex items-end gap-2 mb-2">
               <span className="text-4xl font-bold text-slate-900 dark:text-white">{stats.quizAccuracy}%</span>
               <span className="text-gray-500 dark:text-slate-400 mb-1 font-medium">accuracy</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2 mb-4">
               <div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${stats.quizAccuracy}%` }}></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-50 dark:border-slate-700">
               <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 uppercase font-bold tracking-wide">Questions</p>
                  <p className="text-lg font-semibold text-slate-800 dark:text-white">{stats.totalQuizQuestions}</p>
               </div>
               <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 uppercase font-bold tracking-wide">Correct</p>
                  <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{stats.totalQuizCorrect}</p>
               </div>
            </div>
         </div>

         {/* Exam Analytics Section */}
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <FileText size={20} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">Exam Analytics</h3>
           </div>
           
           <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                 <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-slate-400">
                    <FileText size={14} className="text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wide">Total Exams</span>
                 </div>
                 <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.totalExamsTaken}</p>
              </div>

              <div>
                 <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-slate-400">
                    <Target size={14} className="text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wide">Avg Accuracy</span>
                 </div>
                 <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.examAverageAccuracy}%</p>
              </div>

              <div>
                 <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-slate-400">
                    <Calculator size={14} className="text-blue-400" />
                    <span className="text-xs font-bold uppercase tracking-wide">Avg Score</span>
                 </div>
                 <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.examAverageScore}</p>
              </div>

              <div>
                 <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-slate-400">
                    <Trophy size={14} className="text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wide">Best Score</span>
                 </div>
                 <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.examBestScore}</p>
              </div>
           </div>
         </div>
      </div>
         
      {/* AI Insights Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-indigo-100 dark:border-slate-700 p-6 relative overflow-hidden flex flex-col mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Brain size={20} />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white">AI Coach</h3>
        </div>
        
        {loadingInsights ? (
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 animate-pulse my-auto">
            <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
            <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
            <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
            <span className="text-sm">Analyzing...</span>
          </div>
        ) : (
          <div className="prose prose-sm prose-indigo dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-indigo-50/50 dark:border-slate-700 flex-1">
              {insights || (!user ? "Log in to get personalized AI study insights!" : "Start using the app to get personalized insights!")}
          </div>
        )}
      </div>
    </div>
  );
};