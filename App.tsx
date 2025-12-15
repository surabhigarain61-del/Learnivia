import React, { useState, useEffect } from 'react';
import { AppView, StudySession } from './types';
import { Layout } from './components/Layout';
import { LandingPage } from './components/LandingPage';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { StudyViewer } from './components/StudyViewer';
import { ChatInterface } from './components/ChatInterface';
import { SavedNotes } from './components/SavedNotes';
import { Profile } from './components/Profile';
import { QuickRevision } from './components/QuickRevision';
import { ExamMode } from './components/ExamMode';
import { supabase } from './services/supabase';

const App = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState('English');
  const [session, setSession] = useState<any>(null);

  // Auth Listener
  useEffect(() => {
    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      // If a session exists, we can go to dashboard, but if not, we stay on LANDING
      // We do NOT force AUTH view here anymore.
    }).catch(err => {
      console.warn("Auth check failed:", err);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // If user logs in successfully, take them to Dashboard
      if (session && view === AppView.AUTH) {
        setView(AppView.DASHBOARD);
      }
    });

    return () => subscription.unsubscribe();
  }, [view]);

  // Check system preference for dark mode
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
    }
  }, []);

  // Update HTML class for dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleLogin = () => {
    // Auth component handles the supabase call, listener updates state
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView(AppView.LANDING);
    setCurrentSession(null);
  };

  const handleSessionCreated = (session: StudySession) => {
    setCurrentSession(session);
    setView(AppView.STUDY_SESSION);
  };

  const handleOpenSession = (session: StudySession) => {
    setCurrentSession(session);
    setView(AppView.STUDY_SESSION);
  };

  // Render Logic
  if (view === AppView.LANDING) {
    return (
      <LandingPage 
        onStart={() => setView(AppView.DASHBOARD)} 
        onLogin={() => setView(AppView.AUTH)}
      />
    );
  }

  if (view === AppView.AUTH) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <Layout 
      currentView={view} 
      onChangeView={setView} 
      onLogout={handleLogout}
      language={language}
      setLanguage={setLanguage}
      user={session?.user}
      onAuthRequest={() => setView(AppView.AUTH)}
    >
      {view === AppView.DASHBOARD && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
           <Dashboard 
             onSessionCreated={handleSessionCreated} 
             onViewProfile={() => setView(AppView.PROFILE)}
             isDarkMode={isDarkMode}
             onToggleTheme={toggleTheme}
             language={language}
             setLanguage={setLanguage}
             user={session?.user}
             onAuthRequest={() => setView(AppView.AUTH)}
           />
        </div>
      )}
      
      {view === AppView.STUDY_SESSION && currentSession && (
        <StudyViewer 
          session={currentSession} 
          onBack={() => setView(AppView.DASHBOARD)} 
          onUpdateSession={setCurrentSession}
          onViewProfile={() => setView(AppView.PROFILE)}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          language={language}
          setLanguage={setLanguage}
        />
      )}

      {view === AppView.CHAT && (
        <div className="animate-in fade-in duration-300">
           <ChatInterface language={language} />
        </div>
      )}

      {view === AppView.SAVED && (
        <div className="animate-in fade-in duration-300">
          <SavedNotes onOpenSession={handleOpenSession} />
        </div>
      )}

      {view === AppView.PROFILE && (
        <div className="animate-in fade-in duration-300">
           <Profile user={session?.user} onAuthRequest={() => setView(AppView.AUTH)} />
        </div>
      )}

      {view === AppView.QUICK_REVISION && (
        <div className="animate-in fade-in duration-300">
           <QuickRevision isDarkMode={isDarkMode} language={language} />
        </div>
      )}

      {view === AppView.EXAM_MODE && (
        <div className="animate-in fade-in duration-300">
           <ExamMode language={language} />
        </div>
      )}
    </Layout>
  );
};

export default App;