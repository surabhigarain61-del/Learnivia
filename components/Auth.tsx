import React, { useState } from 'react';
import { Button } from './Button';
import { AlertCircle, CheckCircle, ArrowRight, RefreshCw, Mail } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Logo } from './Logo';

interface AuthProps {
  onLogin: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setNeedsConfirmation(false);

    const cleanEmail = email.trim();

    try {
      if (isLogin) {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        // Successful login is handled by the auth state listener in App.tsx
      } else {
        // Sign Up
        const { error, data } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        
        if (data.session) {
            // Auto logged in (Email confirmation disabled or not required)
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
            // User exists but maybe registered via OAuth or different method
            setError("This email is already registered. Please try logging in.");
            setIsLogin(true);
        } else if (data.user) {
            // User created but needs email confirmation
            setMessage("Account created! Please check your email to confirm your account.");
            setNeedsConfirmation(true);
            setIsLogin(true);
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const msg = (err.message || "").toLowerCase();
      
      if (msg.includes("invalid login credentials")) {
        setError("Incorrect email or password. Double-check for typos.");
      } else if (msg.includes("email not confirmed")) {
        setError("Please confirm your email address before logging in.");
        setNeedsConfirmation(true);
      } else if (msg.includes("user already registered")) {
        setError("This email is already registered. Please log in.");
        setIsLogin(true);
      } else {
        setError(err.message || "An authentication error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) return;
    setResending(true);
    setMessage(null);
    setError(null);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      
      if (error) throw error;
      setMessage("Confirmation email sent! Please check your inbox (and spam folder).");
    } catch (err: any) {
      console.error("Resend error:", err);
      const msg = (err.message || "").toLowerCase();
      if (msg.includes("too many requests")) {
         setError("Too many attempts. Please wait a minute before trying again.");
      } else {
         setError("Failed to resend email: " + err.message);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative overflow-hidden font-sans">
      {/* Background Ambience (Matching Landing Page) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none opacity-40">
         <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
         <div className="absolute top-20 right-10 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
         <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-md w-full bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="drop-shadow-lg scale-110">
               <Logo className="w-16 h-16" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            {isLogin ? 'Enter your details to access your notes.' : 'Start studying smarter today.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm flex flex-col items-start gap-2 border border-red-100 shadow-sm animate-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
               <AlertCircle size={18} className="flex-shrink-0 mt-0.5" /> 
               <span className="leading-relaxed">{error}</span>
            </div>
            {needsConfirmation && (
              <button 
                onClick={handleResendConfirmation}
                disabled={resending}
                className="ml-7 text-xs font-bold underline hover:text-red-700 disabled:opacity-50 flex items-center gap-1"
              >
                {resending ? (
                  <><RefreshCw className="animate-spin" size={12} /> Sending...</>
                ) : (
                  "Resend Confirmation Email"
                )}
              </button>
            )}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-2xl text-sm flex items-start gap-3 border border-green-100 shadow-sm animate-in slide-in-from-top-2">
            <CheckCircle size={18} className="flex-shrink-0 mt-0.5" /> 
            <span className="leading-relaxed">{message}</span>
          </div>
        )}

        <div className="space-y-5">
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Email address</label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-5 py-3.5 rounded-xl border border-gray-200 bg-gray-50/50 text-slate-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all placeholder:text-gray-400 font-medium"
                  placeholder="student@example.com"
                  autoComplete="email"
                />
                <Mail className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3.5 rounded-xl border border-gray-200 bg-gray-50/50 text-slate-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all placeholder:text-gray-400 font-medium"
                placeholder="••••••••"
                minLength={6}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full py-4 text-lg font-bold rounded-xl shadow-xl shadow-purple-500/20 bg-gradient-to-r from-yellow-400 to-purple-600 hover:from-yellow-500 hover:to-purple-700 text-white border-none transform hover:scale-[1.02] transition-all duration-200" 
              isLoading={loading}
            >
              {isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight size={20} className="ml-2 opacity-80" />
            </Button>
          </form>
        </div>

        <div className="mt-8 text-center text-sm">
          <span className="text-slate-500 font-medium">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button 
            onClick={() => { 
              setIsLogin(!isLogin); 
              setError(null); 
              setMessage(null); 
              setNeedsConfirmation(false);
            }}
            className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors hover:underline"
          >
            {isLogin ? 'Sign up for free' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
};