import React, { useState } from 'react';
import { ArrowRight, Brain, Zap, CheckCircle, Sparkles, ChevronDown, Youtube, FileText, Briefcase, GraduationCap } from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';

interface LandingPageProps {
  onStart: () => void;
  onLogin: () => void;
}

const TESTIMONIALS = [
  { text: "I summarize hour-long tech talks in minutes. Essential for my continuous learning as a dev.", name: "Marcus R.", role: "Software Engineer", color: "bg-slate-800" },
  { text: "I used to score 40% in Chem, but now I scored 90% with Learnivia!", name: "Alex M.", role: "Student", color: "bg-blue-500" },
  { text: "Helps me digest complex medical journals and lecture videos without burnout.", name: "Dr. Sarah J.", role: "Medical Resident", color: "bg-emerald-600" },
  { text: "I use it to prepare for my PMP certification. The quizzes are a lifesaver.", name: "Elena D.", role: "Project Manager", color: "bg-purple-500" },
  { text: "Turned my messy meeting notes into a clear summary and action items instantly.", name: "David K.", role: "Consultant", color: "bg-indigo-500" },
  { text: "Exam mode predicted 80% of the questions on my real finals.", name: "Michael T.", role: "High School", color: "bg-orange-500" },
  { text: "Flashcards generated from my history textbook PDF. Saved me hours of typing.", name: "Jessica L.", role: "Undergrad", color: "bg-pink-500" },
  { text: "I learn new marketing strategies from YouTube, and this app keeps my notes organized.", name: "Chris P.", role: "Marketing Lead", color: "bg-cyan-600" },
  { text: "My GPA went from 2.8 to 3.8. It's like having a private tutor.", name: "Amanda B.", role: "Student", color: "bg-teal-500" },
  { text: "Great for upskilling. I learned Python concepts much faster using the explainer tool.", name: "James W.", role: "Data Analyst", color: "bg-rose-500" },
  { text: "Summaries cut my research time in half. Highly recommend for academics.", name: "Olivia S.", role: "PhD Candidate", color: "bg-violet-600" },
  { text: "Finally, a tool that works for professional certifications, not just school subjects.", name: "Sophia G.", role: "HR Director", color: "bg-amber-600" }
];

const FAQS = [
  { q: "Who is Learnivia for?", a: "Everyone who needs to learn. Whether you are a student preparing for exams, a professional upskilling for a new role, or a lifelong learner digesting complex topics, Learnivia adapts to your needs." },
  { q: "Can I really turn YouTube videos into notes?", a: "Yes. Simply paste a link to any educational YouTube video. Our AI extracts the transcript, summarizes the key points, and even generates quizzes to ensure you understood the content without watching the whole video." },
  { q: "I'm a professional. How does this help my career?", a: "Use it to quickly summarize industry reports, digest technical documentation, prepare for certification exams (like AWS, CPA, PMP), or turn long meeting recordings/webinars into actionable notes." },
  { q: "What file formats can I upload?", a: "You can upload PDFs, images of handwritten notes or slides, and paste links to YouTube videos. You can also paste raw text directly." },
  { q: "How is this different from standard AI chat?", a: "Standard AI is unstructured. Learnivia is a dedicated workflow tool. We don't just 'chat'; we automatically organize content into Study Guides, Flashcards, and Mock Exams, tracking your mastery over time." },
  { q: "Can it help with technical or niche subjects?", a: "Absolutely. The AI is trained on a vast amount of academic and technical data, making it capable of explaining complex engineering, medical, legal, and financial concepts." },
  { q: "Is my data secure?", a: "Yes. Your notes, uploaded files, and learning history are private to your account. We do not share your personal study data." },
  { q: "Does it work for non-English content?", a: "Yes. Learnivia supports multiple languages. You can upload content in one language and ask for explanations or summaries in another." },
  { q: "Is there a limit to how much I can study?", a: "The Free plan has generous usage limits suitable for most casual learners. The Pro plan offers unlimited analysis, higher file limits, and advanced AI models for power users." },
  { q: "Can I use it on my phone?", a: "Yes. Learnivia is fully responsive and works great on mobile browsers, so you can review flashcards or listen to explanations on your commute." }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onLogin }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navbar */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8" />
            <span className="text-xl font-bold text-slate-900 tracking-tight">Learnivia</span>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" onClick={onLogin}>Log In</Button>
            <Button onClick={onStart}>Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-indigo-50/30 via-white to-white pt-20 pb-16 lg:pt-32 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-5xl md:text-7xl font-medium font-display text-slate-900 tracking-tight mb-8">
            Master any topic. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-purple-600">
              In record time.
            </span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-xl mx-auto mb-10 leading-relaxed text-center">
            Turn complex notes, PDFs, and videos into clear summaries, quizzes, and actionable knowledge instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={onStart} 
              className="px-10 py-4 text-lg h-auto rounded-full bg-gradient-to-r from-yellow-400 to-purple-600 hover:from-yellow-500 hover:to-purple-700 text-white border-none shadow-xl shadow-purple-200/50 hover:scale-105 transition-transform"
            >
              Start Learning <ArrowRight className="ml-2" size={20} />
            </Button>
          </div>
        </div>
        
        {/* Background blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none opacity-40">
           <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
           <div className="absolute top-20 right-10 w-72 h-72 bg-cyan-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
           <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* YouTube Feature Highlight - Light Theme */}
      <div className="py-20 bg-white border-y border-gray-100 overflow-hidden relative">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-12">
               <div className="flex-1 space-y-6">
                  <div className="inline-flex items-center gap-2 bg-red-50 px-3 py-1 rounded-full text-red-600 font-bold uppercase tracking-wider text-xs">
                     <Youtube size={16} /> New Feature
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold leading-tight text-slate-900">
                     Don't watch it all. <br />
                     <span className="text-indigo-600">Just know it.</span>
                  </h2>
                  <p className="text-gray-600 text-lg leading-relaxed">
                     Paste a link to any educational YouTube video. Learnivia instantly extracts the transcript, generates a concise summary, and creates a quiz to test your understanding—saving you hours of watch time.
                  </p>
                  <ul className="space-y-3 text-gray-600">
                     <li className="flex items-center gap-3"><CheckCircle className="text-green-500" size={20} /> Convert 1-hour lectures into 5-minute reads</li>
                     <li className="flex items-center gap-3"><CheckCircle className="text-green-500" size={20} /> Extract key terms and definitions automatically</li>
                     <li className="flex items-center gap-3"><CheckCircle className="text-green-500" size={20} /> Chat with the video content to ask specific questions</li>
                  </ul>
                  <Button onClick={onStart} variant="outline" className="mt-4">
                     Try it with a Video
                  </Button>
               </div>
               
               {/* Visual Graphic - Adapted for Light Mode */}
               <div className="flex-1 flex justify-center">
                  <div className="relative w-full max-w-md aspect-video bg-gray-50 rounded-2xl border border-gray-200 shadow-xl shadow-gray-200 p-6 flex items-center justify-between">
                     <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-100 border border-red-50">
                           <Youtube size={32} className="text-red-600" />
                        </div>
                        <span className="text-xs font-mono text-gray-500">Video Source</span>
                     </div>
                     
                     <div className="flex-1 h-0.5 bg-gradient-to-r from-gray-200 via-indigo-300 to-gray-200 mx-4 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-full border border-gray-200 shadow-sm">
                           <Sparkles size={16} className="text-indigo-500 animate-pulse" />
                        </div>
                     </div>

                     <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 border border-emerald-50">
                           <FileText size={32} className="text-emerald-600" />
                        </div>
                        <span className="text-xs font-mono text-gray-500">Study Guide</span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Feature Grid */}
      <div className="py-20 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">One Tool. Endless Possibilities.</h2>
            <p className="text-gray-600 mt-4 max-w-2xl mx-auto">Whether you're studying for finals or preparing for a board meeting, we have the tools you need.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { 
                icon: <Brain className="text-indigo-600" size={32} />, 
                title: "Deep Explanations", 
                desc: "Paste complex text and get simple, analogy-rich explanations instantly." 
              },
              { 
                icon: <Zap className="text-amber-500" size={32} />, 
                title: "Smart Summaries", 
                desc: "Condense pages of notes or reports into concise bullet points." 
              },
              { 
                icon: <Briefcase className="text-purple-500" size={32} />, 
                title: "Pro Revision", 
                desc: "Synthesize meetings and docs into high-impact review guides." 
              },
              { 
                icon: <GraduationCap className="text-emerald-500" size={32} />, 
                title: "Exam/Cert Prep", 
                desc: "Auto-generate mock exams for University or Professional Certs." 
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-2xl bg-white border border-gray-100 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-300 group hover:-translate-y-1">
                <div className="mb-4 p-3 bg-gray-50 w-fit rounded-xl group-hover:bg-indigo-50 transition-colors">{feature.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section (Infinite Scroll) */}
      <div className="py-24 bg-white overflow-hidden relative">
        <div className="text-center mb-12">
           <h2 className="text-3xl font-bold text-slate-900">Loved by Learners & Pros</h2>
        </div>

        {/* Gradient Blur Edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-r from-white to-transparent pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-32 z-10 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>

        <div className="flex animate-scroll hover:[animation-play-state:paused] w-[calc(400px*24)]">
          {/* First set of items */}
          {TESTIMONIALS.map((t, i) => (
             <TestimonialCard key={`first-${i}`} {...t} />
          ))}
          {/* Duplicate set for seamless loop */}
          {TESTIMONIALS.map((t, i) => (
             <TestimonialCard key={`second-${i}`} {...t} />
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Common Questions</h2>
            <p className="text-gray-600 mt-4">Everything you need to know about Learnivia.</p>
          </div>
          
          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <div key={index} className="rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleFaq(index)}
                  className={`
                    w-full flex items-center justify-between p-6 text-left rounded-xl transition-all duration-300
                    border border-gray-200 group
                    hover:bg-slate-900 hover:text-white hover:border-slate-900
                    ${openFaq === index ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-900'}
                  `}
                >
                  <span className="font-semibold text-lg pr-4">{faq.q}</span>
                  <ChevronDown 
                    className={`flex-shrink-0 transition-transform duration-300 ${
                      openFaq === index ? 'rotate-180 text-white' : 'text-gray-400 group-hover:text-white'
                    }`} 
                    size={20} 
                  />
                </button>
                
                <div 
                  className={`
                    overflow-hidden transition-all duration-300 ease-in-out
                    ${openFaq === index ? 'max-h-64 opacity-100 mt-2' : 'max-h-0 opacity-0'}
                  `}
                >
                  <div className="p-6 bg-white rounded-xl text-gray-600 font-normal leading-relaxed border border-gray-200 shadow-sm">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Footer CTA */}
      <div className="py-20 bg-white border-t border-gray-100">
         <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Ready to upgrade your brain?</h2>
            <p className="text-xl text-gray-600 mb-8">Join thousands of students and professionals learning smarter today.</p>
            <Button onClick={onStart} size="lg" className="px-10 py-4 text-lg rounded-full shadow-xl shadow-purple-200/50 bg-gradient-to-r from-yellow-400 to-purple-600 hover:from-yellow-500 hover:to-purple-700 text-white border-none hover:scale-105 transition-transform">
               Start Learning
            </Button>
         </div>
      </div>
    </div>
  );
};

const TestimonialCard: React.FC<{ text: string, name: string, role: string, color: string }> = ({ text, name, role, color }) => (
  <div className="w-[400px] flex-shrink-0 px-4">
    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-lg shadow-gray-100 h-full flex flex-col justify-between hover:border-indigo-200 transition-colors">
      <div className="mb-6">
         <div className="flex gap-1 mb-4">
            {[1,2,3,4,5].map(i => <div key={i} className="w-4 h-4 bg-amber-400 rounded-sm"></div>)}
         </div>
         <p className="text-lg text-slate-700 font-medium leading-relaxed">
           "{text}"
         </p>
      </div>
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
           {name.charAt(0)}
        </div>
        <div>
          <p className="font-bold text-slate-900">{name}</p>
          <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">{role}</p>
        </div>
      </div>
    </div>
  </div>
);