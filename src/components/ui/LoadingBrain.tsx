import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface LoadingBrainProps {
  messages: string[];
  subtitle: string;
}

export function LoadingBrain({ messages, subtitle }: LoadingBrainProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="animate-pulse-glow w-24 h-24 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 rounded-full flex items-center justify-center mb-8 relative">
        <div className="animate-float text-white text-3xl">
          <FontAwesomeIcon icon="brain" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-orbit-dot w-3 h-3 bg-indigo-300 rounded-full absolute" />
          <div className="animate-orbit-dot w-2 h-2 bg-violet-300 rounded-full absolute" style={{ animationDelay: '-1s' }} />
          <div className="animate-orbit-dot w-2.5 h-2.5 bg-purple-300 rounded-full absolute" style={{ animationDelay: '-2s' }} />
        </div>
      </div>
      <div className="h-8 flex items-center justify-center mb-6">
        <RotatingText messages={messages} />
      </div>
      <div className="w-full max-w-[200px] mb-4">
        <div className="bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div className="animate-progress-crawl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 h-full rounded-full relative">
            <div className="animate-shimmer absolute inset-0 rounded-full" />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 font-bold">{subtitle}</p>
    </div>
  );
}

function RotatingText({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0);
  const [animClass, setAnimClass] = useState('animate-text-enter');

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimClass('animate-text-exit');
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % messages.length);
        setAnimClass('animate-text-enter');
      }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <p className={`text-sm font-bold text-slate-600 ${animClass}`}>
      {messages[index]}
    </p>
  );
}
