import React from 'react';
import { AppView } from '../types';
import { LANGUAGES } from '../constants';
import { Logo } from './Logo';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Library, 
  User, 
  LogOut, 
  Zap,
  GraduationCap,
  Sparkles,
  Menu,
  Globe,
  LogIn
} from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
  language: string;
  setLanguage: (lang: string) => void;
  user: any;
  onAuthRequest: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onChangeView, 
  isOpen, 
  onCloseMobile,
  onLogout,
  isCollapsed = false,
  toggleCollapse,
  language,
  setLanguage,
  user,
  onAuthRequest
}) => {
  const menuItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: <LayoutDashboard size={24} /> },
    { id: AppView.QUICK_REVISION, label: 'Quick Revision', icon: <Zap size={24} /> },
    { id: AppView.EXAM_MODE, label: 'Exam Mode', icon: <GraduationCap size={24} /> },
    { id: AppView.SAVED, label: 'Saved Notes', icon: <Library size={24} /> },
    { 
      id: AppView.CHAT, 
      label: 'AI Tutor', 
      icon: (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1 rounded-md shadow-sm">
          <Sparkles size={16} className="text-white" fill="currentColor" />
        </div>
      ) 
    },
    { id: AppView.PROFILE, label: 'Profile', icon: <User size={24} /> },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Content */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-30
        bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 shadow-xl md:shadow-none
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col h-full
        ${isCollapsed ? 'w-[88px]' : 'w-72'}
        md:rounded-r-3xl md:my-0 md:border-r-2
      `}>
        {/* Header */}
        <div className={`
           p-6 border-b border-gray-50 dark:border-slate-800 flex items-center 
           ${isCollapsed ? 'justify-center flex-col gap-4' : 'justify-between'}
        `}>
          <div className="flex items-center gap-3">
             <div className="drop-shadow-lg">
               <Logo className="w-10 h-10" />
             </div>
             {!isCollapsed && (
               <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap overflow-hidden">
                 Learnivia
               </span>
             )}
          </div>
          
          {/* Desktop Toggle Button */}
          <button 
             onClick={toggleCollapse}
             className="hidden md:flex p-2 text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
             title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
             <Menu size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-1">
          <button 
            onClick={() => {
              onChangeView(AppView.DASHBOARD);
              onCloseMobile();
            }}
            className={`
              w-full mb-6 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 
              flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-start px-4 gap-3'} 
              py-3 rounded-xl font-medium transition-colors border border-indigo-100 dark:border-indigo-500/10 group relative
            `}
            title="New Study Session"
          >
            <PlusCircle size={24} />
            {!isCollapsed && <span>New Session</span>}
            {isCollapsed && (
               <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                 New Session
               </div>
            )}
          </button>

          {!isCollapsed && (
             <div className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-4 mt-8 animate-in fade-in">
                Menu
             </div>
          )}
          
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onChangeView(item.id);
                onCloseMobile();
              }}
              className={`
                w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-start px-4 gap-3'} 
                py-3 rounded-xl text-sm font-medium transition-all group relative
                ${currentView === item.id 
                  ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-md' 
                  : item.id === AppView.QUICK_REVISION 
                    ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 font-semibold'
                  : item.id === AppView.EXAM_MODE
                    ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 font-semibold'
                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-200'}
              `}
              title={isCollapsed ? item.label : ''}
            >
              <div className="flex-shrink-0">{item.icon}</div>
              {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.label}</span>}
              
              {/* Tooltip for collapsed mode */}
              {isCollapsed && (
                 <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                   {item.label}
                 </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-50 dark:border-slate-800 space-y-2">
          {/* Mobile-only Language Selector inside Sidebar */}
          <div className={`md:hidden ${isCollapsed ? 'hidden' : 'block'}`}>
             <div className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                <Globe size={14} /> Output Language
             </div>
             <select 
               value={language}
               onChange={(e) => setLanguage(e.target.value)}
               className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
             >
               {LANGUAGES.map(lang => (
                 <option key={lang} value={lang}>{lang}</option>
               ))}
             </select>
          </div>

          {user ? (
            <button 
              onClick={onLogout}
              className={`
                w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start gap-3'} 
                px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors
              `}
              title="Sign Out"
            >
              <LogOut size={24} />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          ) : (
             <button 
               onClick={onAuthRequest}
               className={`
                 w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start gap-3'} 
                 px-4 py-3 rounded-xl text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors
               `}
               title="Log In"
             >
               <LogIn size={24} />
               {!isCollapsed && <span>Log In</span>}
             </button>
          )}
        </div>
      </div>
    </>
  );
};