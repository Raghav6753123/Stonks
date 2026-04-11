'use client';

import { useEffect, useState } from 'react';

export default function InitialLoader() {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000);
    
    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + 100 / 30; // reaches 100 in ~3 seconds
      });
    }, 100);
    
    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a12]">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#10b981]/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#6366f1]/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
      
      <div className="relative flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#10b981] to-[#059669] flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white">Stonks</span>
        </div>
        
        {/* Loader */}
        <div className="relative">
          <BallBouncingLoader />
        </div>
        
        {/* Progress bar */}
        <div className="w-48 h-1 bg-[#1e1e2e] rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#10b981] to-[#6366f1] rounded-full transition-all duration-100 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Loading text */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-gray-400 text-sm">Initializing AI Engine...</p>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BallBouncingLoader() {
  return (
    <div className="relative h-[120px] w-[90px]">
      {/* Glow base */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-2 bg-[#10b981]/20 rounded-full blur-md" />
      
      {/* Bars with gradient and glow */}
      <div className="animate-barUp1 absolute bottom-0 left-0 h-1/2 w-[12px] origin-bottom rounded-t-sm bg-gradient-to-t from-[#10b981] to-[#34d399] shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
      <div className="animate-barUp2 absolute bottom-0 left-[18px] h-1/2 w-[12px] origin-bottom rounded-t-sm bg-gradient-to-t from-[#10b981] to-[#34d399] shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
      <div className="animate-barUp3 absolute bottom-0 left-[36px] h-1/2 w-[12px] origin-bottom rounded-t-sm bg-gradient-to-t from-[#10b981] to-[#34d399] shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
      <div className="animate-barUp4 absolute bottom-0 left-[54px] h-1/2 w-[12px] origin-bottom rounded-t-sm bg-gradient-to-t from-[#10b981] to-[#34d399] shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
      <div className="animate-barUp5 absolute bottom-0 left-[72px] h-1/2 w-[12px] origin-bottom rounded-t-sm bg-gradient-to-t from-[#10b981] to-[#34d399] shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>

      {/* Ball with glow trail */}
      <div className="animate-ball absolute bottom-[12px] left-[1px] h-[12px] w-[12px] rounded-full bg-gradient-to-br from-[#818cf8] to-[#6366f1] shadow-[0_0_20px_rgba(99,102,241,0.8),0_0_40px_rgba(99,102,241,0.4)]"></div>
    </div>
  );
}
