import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { AppView } from '../types';
import { Menu } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  onLogout: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  user: any;
  onAuthRequest: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentView, 
  onChangeView,
  onLogout,
  language,
  setLanguage,
  user,
  onAuthRequest
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile state
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop state

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex font-sans relative overflow-hidden transition-colors duration-300">
      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-50 dark:opacity-20">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-100/50 blur-[100px] animate-blob"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-100/50 blur-[100px] animate-blob animation-delay-2000"></div>
         <div className="absolute top-[20%] right-[20%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-[80px] animate-blob animation-delay-4000"></div>
      </div>

      <Sidebar 
        currentView={currentView}
        onChangeView={onChangeView}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onLogout={onLogout}
        isCollapsed={isCollapsed}
        toggleCollapse={() => setIsCollapsed(!isCollapsed)}
        language={language}
        setLanguage={setLanguage}
        user={user}
        onAuthRequest={onAuthRequest}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        {/* Mobile Header */}
        <header className="md:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 dark:text-gray-300">
            <Menu size={24} />
          </button>
          <span className="font-bold text-slate-900 dark:text-white text-lg tracking-tight">Learnivia</span>
          <div className="w-8"></div> {/* Spacer for center alignment */}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
};