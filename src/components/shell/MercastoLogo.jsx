import React from 'react';

const MercastoLogo = ({ className = "h-11", isFooter = false, tagline = "" }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    {/* Новый лаконичный логотип: Буква "M" внутри геолокационного пина */}
    <svg viewBox="0 0 100 100" className="h-full w-auto drop-shadow-md">
      <path d="M50 5 C27.9 5 10 22.9 10 45 C10 75 50 95 50 95 C50 95 90 75 90 45 C90 22.9 72.1 5 50 5 Z" fill="#84CC16" />
      <path d="M30 60 L30 35 L50 50 L70 35 L70 60" fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <div className="flex flex-col justify-center">
      <span className={`font-sans text-xl md:text-2xl font-black leading-none tracking-tight ${isFooter ? 'text-white' : 'text-slate-900 dark:text-white'}`}>Mercasto</span>
      <span className={`text-[7.5px] font-bold uppercase tracking-widest leading-none mt-1 ${isFooter ? 'text-[#84CC16]' : 'text-[#3f6212] dark:text-[#84CC16]'}`}>
        <span className="sm:hidden">AI</span>
        <span className="hidden sm:inline">{tagline}</span>
      </span>
    </div>
  </div>
);


export default MercastoLogo;
