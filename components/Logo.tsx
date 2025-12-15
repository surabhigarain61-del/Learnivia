import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradient" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" /> {/* Amber */}
          <stop offset="50%" stopColor="#EC4899" /> {/* Pink */}
          <stop offset="100%" stopColor="#6366F1" /> {/* Indigo */}
        </linearGradient>
      </defs>
      
      {/* Decorative Stars */}
      <path d="M85 15L87 20L92 20L88 23L89 28L85 25L81 28L82 23L78 20L83 20L85 15Z" fill="#6366F1" className="animate-pulse" />
      <path d="M15 50L17 54L22 54L18 57L19 62L15 59L11 62L12 57L8 54L13 54L15 50Z" fill="#8B5CF6" className="animate-pulse" style={{ animationDelay: '1s' }} />
      <path d="M80 60L82 64L87 64L83 67L84 72L80 69L76 72L77 67L73 64L78 64L80 60Z" fill="#EC4899" className="animate-pulse" style={{ animationDelay: '0.5s' }} />

      {/* Pen Body - Tilted 45deg */}
      <g transform="rotate(45 50 50)">
        {/* Cap */}
        <path d="M35 15 H65 V28 H35 Z" fill="#F59E0B" />
        {/* Cap Highlight */}
        <rect x="38" y="18" width="24" height="2" rx="1" fill="white" fillOpacity="0.4" />

        {/* Barrel */}
        <path d="M35 28 H65 V70 H35 Z" fill="url(#logoGradient)" />
        {/* Barrel Highlight */}
        <rect x="58" y="32" width="3" height="35" rx="1.5" fill="white" fillOpacity="0.3" />
        
        {/* Nib Holder */}
        <path d="M35 70 L50 90 L65 70 Z" fill="#6366F1" />
        {/* Tip */}
        <circle cx="50" cy="90" r="2" fill="#4F46E5" />
        
        {/* Split line for realism */}
        <path d="M50 70 L50 85" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
      </g>
    </svg>
  );
};