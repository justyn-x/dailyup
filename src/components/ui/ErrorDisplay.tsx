import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface ErrorDisplayProps {
  message: string;
  onRetry: () => void;
}

export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-5">
        <FontAwesomeIcon icon="exclamation-triangle" className="text-3xl text-red-300" />
      </div>
      <p className="text-sm font-bold text-slate-700 mb-2 text-center">生成遇到了问题</p>
      <p className="text-xs text-slate-400 text-center mb-1 px-4">{message}</p>
      <p className="text-[10px] text-slate-300 text-center mb-6">试试细化你的学习目标，可能会有更好的效果</p>
      <button
        onClick={onRetry}
        className="bg-indigo-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all hover:opacity-90 hover:-translate-y-px hover:shadow-lg active:translate-y-0"
      >
        <FontAwesomeIcon icon="redo" className="mr-1.5" />
        重新尝试
      </button>
    </div>
  );
}
