import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useProfileStore } from '../stores/profileStore';

const AVATAR_SEEDS = [
  'Felix', 'Luna', 'Max', 'Lily', 'Oscar', 'Chloe',
  'Leo', 'Mia', 'Bella', 'Charlie', 'Nala', 'Simba',
];

function getAvatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { nickname, avatar, setProfile } = useProfileStore();
  const [localNickname, setLocalNickname] = useState(nickname);
  const [selectedSeed, setSelectedSeed] = useState(avatar);
  const [saved, setSaved] = useState(false);

  function handleSelectAvatar(seed: string) {
    setSelectedSeed(seed);
    setProfile({ avatar: seed });
  }

  function handleSave() {
    setProfile({ nickname: localNickname.trim() || '学习家' });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-[560px] mx-auto">
      <header className="flex items-center mb-8">
        <button
          onClick={() => location.key !== 'default' ? navigate(-1) : navigate('/settings')}
          className="p-2 -ml-2 text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <FontAwesomeIcon icon="arrow-left" />
        </button>
        <h2 className="ml-2 text-xl font-extrabold text-slate-900">个人资料</h2>
      </header>

      {/* Current avatar display */}
      <div className="flex flex-col items-center mb-6">
        <img
          className="w-24 h-24 rounded-[1.5rem] bg-indigo-50 border-4 border-white shadow-lg object-cover mb-2"
          src={getAvatarUrl(selectedSeed)}
          alt="avatar"
        />
        <p className="text-[11px] text-slate-400 font-bold">选择下方头像更换</p>
      </div>

      {/* Avatar grid */}
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 mb-6">
        <p className="text-xs font-bold text-slate-500 mb-4">选择头像</p>
        <div className="grid grid-cols-6 gap-3">
          {AVATAR_SEEDS.map((seed) => (
            <div
              key={seed}
              onClick={() => handleSelectAvatar(seed)}
              className={`w-full aspect-square rounded-2xl flex items-center justify-center cursor-pointer transition-all border-2 overflow-hidden bg-slate-50 hover:shadow-md ${
                seed === selectedSeed
                  ? 'border-indigo-400 shadow-md ring-2 ring-indigo-200'
                  : 'border-transparent hover:border-slate-200'
              }`}
            >
              <img src={getAvatarUrl(seed)} alt={seed} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* Nickname */}
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 mb-6">
        <label className="text-xs font-bold text-slate-500 mb-2 block">昵称</label>
        <input
          type="text"
          value={localNickname}
          onChange={(e) => setLocalNickname(e.target.value)}
          placeholder="输入你的昵称"
          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none text-sm font-bold focus:border-indigo-300 focus:bg-white transition-all mb-4"
        />
        <button
          onClick={handleSave}
          className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-sm transition-all hover:opacity-90 hover:-translate-y-px hover:shadow-lg active:translate-y-0"
        >
          <FontAwesomeIcon icon="check" className="mr-1.5" />
          保存
        </button>
        {saved && (
          <div className="text-center text-xs font-bold py-2 rounded-xl mt-3 bg-green-50 text-green-600">
            保存成功
          </div>
        )}
      </div>
    </div>
  );
}
