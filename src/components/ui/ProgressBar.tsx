interface ProgressBarProps {
  progress: number;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="bg-slate-100 h-2.5 rounded-full overflow-hidden">
      <div
        className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-700"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
