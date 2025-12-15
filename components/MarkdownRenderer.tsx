import React from 'react';
import ReactMarkdown from 'react-markdown';

export const MarkdownRenderer: React.FC<{ content: string; isDark?: boolean }> = ({ content, isDark = false }) => {
  return (
    <div className={`prose prose-sm md:prose-base max-w-none ${isDark ? 'prose-invert' : 'prose-slate'}`}>
      <ReactMarkdown
        components={{
          h1: ({node, ...props}) => <h1 className={`text-2xl font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-800'}`} {...props} />,
          h2: ({node, ...props}) => <h2 className={`text-xl font-bold mt-6 mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`} {...props} />,
          h3: ({node, ...props}) => <h3 className={`text-lg font-semibold mt-4 mb-2 ${isDark ? 'text-slate-300' : 'text-slate-800'}`} {...props} />,
          ul: ({node, ...props}) => <ul className={`list-disc list-outside ml-5 space-y-1 mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} {...props} />,
          ol: ({node, ...props}) => <ol className={`list-decimal list-outside ml-5 space-y-1 mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} {...props} />,
          li: ({node, ...props}) => <li className={isDark ? 'text-slate-300' : 'text-slate-700'} {...props} />,
          p: ({node, ...props}) => <p className={`leading-relaxed mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} {...props} />,
          strong: ({node, ...props}) => <strong className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`} {...props} />,
          blockquote: ({node, ...props}) => <blockquote className={`border-l-4 pl-4 italic my-4 ${isDark ? 'border-indigo-500 text-slate-400' : 'border-indigo-200 text-slate-600'}`} {...props} />,
          code: ({node, ...props}) => <code className={`px-1 py-0.5 rounded text-sm font-mono ${isDark ? 'bg-slate-800 text-indigo-300' : 'bg-slate-100 text-indigo-600'}`} {...props} />,
          hr: ({node, ...props}) => <hr className={`my-6 ${isDark ? 'border-slate-700' : 'border-slate-200'}`} {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};