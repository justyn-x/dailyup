import { useState, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get all completed chapters
  const completedChapters = useLiveQuery(
    () => db.chapters.where('status').equals('assessment_completed').toArray(),
    [],
  );

  // Compute active days for current month
  const activeDays = useMemo(() => {
    if (!completedChapters) return new Set<number>();
    const days = new Set<number>();
    for (const ch of completedChapters) {
      if (!ch.completedAt) continue;
      const d = new Date(ch.completedAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        days.add(d.getDate());
      }
    }
    return days;
  }, [completedChapters, year, month]);

  // Calculate streak
  const streak = useMemo(() => {
    if (!completedChapters) return 0;
    const allDates = new Set<string>();
    for (const ch of completedChapters) {
      if (!ch.completedAt) continue;
      const d = new Date(ch.completedAt);
      allDates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    let count = 0;
    const today = new Date();
    const check = new Date(today);
    while (true) {
      const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
      if (allDates.has(key)) {
        count++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, [completedChapters]);

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const monthStr = currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  return (
    <div className="max-w-[560px] mx-auto">
      <header className="mb-8">
        <h2 className="text-2xl font-extrabold text-slate-900">学习日历</h2>
        <p className="text-slate-400 text-xs font-bold mt-1">坚持就是胜利，加油！</p>
      </header>

      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-6">
        <div className="flex justify-between items-center mb-6">
          <span className="font-extrabold text-slate-800">{monthStr}</span>
          <div className="flex space-x-2">
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <FontAwesomeIcon icon="chevron-left" className="text-xs" />
            </button>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <FontAwesomeIcon icon="chevron-right" className="text-xs" />
            </button>
          </div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-2 text-slate-400 text-[10px] font-extrabold text-center mb-4 uppercase">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for offset */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = isCurrentMonth && day === todayDate;
            const isActive = activeDays.has(day);

            let cellClass = 'aspect-square flex items-center justify-center font-bold text-sm rounded-xl transition-all';
            if (isActive && isToday) {
              cellClass += ' bg-indigo-600 text-white';
            } else if (isActive) {
              cellClass += ' bg-indigo-50 text-indigo-600 relative';
            } else if (isToday) {
              cellClass += ' bg-slate-100 text-slate-800';
            } else {
              cellClass += ' text-slate-400';
            }

            return (
              <div key={day} className={cellClass}>
                {day}
                {isActive && !isToday && (
                  <div className="absolute bottom-1 w-1 h-1 bg-indigo-500 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Streak card */}
      <div className="bg-indigo-600 rounded-[2rem] p-6 text-white flex items-center justify-between shadow-lg shadow-indigo-100">
        <div>
          <p className="text-[10px] font-extrabold opacity-70 mb-1 uppercase">连续打卡</p>
          <h4 className="text-2xl font-extrabold italic">{streak} DAYS</h4>
        </div>
        <FontAwesomeIcon icon="fire" className="text-3xl text-orange-400" />
      </div>
    </div>
  );
}
