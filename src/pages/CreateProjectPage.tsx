import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { db } from '../db';
import { generateId } from '../lib/utils';

export function CreateProjectPage() {
  const navigate = useNavigate();
  const [goal, setGoal] = useState('');
  const [background, setBackground] = useState('');
  const [skills, setSkills] = useState('');
  const [goalError, setGoalError] = useState(false);

  async function handleSubmit() {
    if (!goal.trim()) {
      setGoalError(true);
      return;
    }
    setGoalError(false);

    const id = generateId();
    await db.projects.add({
      id,
      goal: goal.trim(),
      background: background.trim(),
      skills: skills.trim(),
      createdAt: new Date().toISOString(),
      planStatus: 'pending',
    });

    navigate(`/project/${id}`);
  }

  return (
    <div className="max-w-[560px] mx-auto">
      <header className="flex items-center mb-8">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <FontAwesomeIcon icon="arrow-left" />
        </button>
        <h2 className="ml-2 text-xl font-extrabold text-slate-900">开启新计划</h2>
      </header>

      <div className="space-y-5">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">
            学习目标 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={goal}
            onChange={(e) => {
              setGoal(e.target.value);
              if (e.target.value.trim()) setGoalError(false);
            }}
            placeholder="我想学会..."
            className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold shadow-sm focus:border-indigo-300 transition-all"
          />
          {goalError && (
            <p className="text-red-500 text-xs font-bold mt-1.5 ml-1">
              <FontAwesomeIcon icon="exclamation-circle" className="mr-1" />
              请输入学习目标
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">我的背景</label>
          <textarea
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            placeholder="我的专业背景是..."
            rows={3}
            className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold resize-none shadow-sm focus:border-indigo-300 transition-all"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">已有技能</label>
          <input
            type="text"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="已掌握的相关技能（可选）"
            className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold shadow-sm focus:border-indigo-300 transition-all"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full bg-slate-900 text-white font-extrabold py-5 rounded-2xl shadow-xl transition-all hover:opacity-90 hover:-translate-y-px hover:shadow-lg active:translate-y-0 mt-2"
        >
          <FontAwesomeIcon icon="wand-magic-sparkles" className="mr-2" />
          AI 智能规划
        </button>
      </div>
    </div>
  );
}
