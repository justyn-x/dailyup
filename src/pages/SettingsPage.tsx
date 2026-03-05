import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useProfileStore } from '../stores/profileStore';
import { useLLMConfigStore } from '../stores/llmConfigStore';
import { db } from '../db';

function getAvatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { nickname, avatar } = useProfileStore();
  const llmConfig = useLLMConfigStore();
  const isConfigured = llmConfig.isConfigured();

  async function clearAllData() {
    if (!window.confirm('确定要清除所有数据吗？此操作不可恢复。')) return;
    await db.projects.clear();
    await db.chapters.clear();
    localStorage.removeItem('dailyup-llm-config');
    localStorage.removeItem('dailyup-profile');
    window.location.reload();
  }

  return (
    <div className="max-w-[560px] mx-auto">
      <header className="mb-8">
        <h2 className="text-2xl font-extrabold text-slate-900">设置</h2>
      </header>

      {/* Profile card */}
      <div
        onClick={() => navigate('/settings/profile')}
        className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 mb-6 flex items-center space-x-4 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all"
      >
        <img
          className="w-16 h-16 rounded-[1.2rem] bg-indigo-50 border-2 border-white shadow-sm object-cover"
          src={getAvatarUrl(avatar)}
          alt="avatar"
        />
        <div className="flex-1 min-w-0">
          <p className="text-base font-extrabold text-slate-900 truncate">{nickname}</p>
          <p className="text-[11px] text-slate-400 font-bold mt-0.5">个人资料、头像设置</p>
        </div>
        <FontAwesomeIcon icon="chevron-right" className="text-slate-300 text-xs shrink-0" />
      </div>

      {/* Menu items */}
      <div className="space-y-1">
        <div
          onClick={() => navigate('/settings/llm')}
          className="flex items-center p-4 bg-white rounded-[1.25rem] mb-3 border border-slate-100 cursor-pointer transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-slate-200"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-500 text-white rounded-xl flex items-center justify-center mr-4">
            <FontAwesomeIcon icon="robot" />
          </div>
          <div className="flex-1">
            <span className="font-bold text-slate-700">AI 模型配置</span>
            <p className={`text-[10px] font-bold mt-0.5 ${isConfigured ? 'text-green-500' : 'text-amber-500'}`}>
              {isConfigured ? `${llmConfig.model} · 已配置` : '未配置'}
            </p>
          </div>
          <FontAwesomeIcon icon="chevron-right" className="text-slate-300 text-xs" />
        </div>

        <div
          onClick={clearAllData}
          className="flex items-center p-4 bg-white rounded-[1.25rem] mt-4 border border-red-50 text-red-500 cursor-pointer transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:border-red-200"
        >
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mr-4">
            <FontAwesomeIcon icon="trash-alt" />
          </div>
          <span className="flex-1 font-bold">清除所有数据</span>
        </div>
      </div>
    </div>
  );
}
