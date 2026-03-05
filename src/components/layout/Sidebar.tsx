import { NavLink, useLocation, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useProjects } from '../../hooks/useProjects';
import { useChapters } from '../../hooks/useChapters';
import { useProfileStore } from '../../stores/profileStore';
import { calculateProgress } from '../../lib/utils';

function getAvatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export function Sidebar() {
  const projects = useProjects();
  const { nickname, avatar } = useProfileStore();
  const location = useLocation();

  const isSettingsActive = location.pathname.startsWith('/settings');

  return (
    <aside className="w-[220px] shrink-0 flex flex-col py-4 border-r border-slate-100/60 bg-[rgba(248,249,253,0.8)] backdrop-blur-[12px] overflow-y-auto scrollbar-hide">
      {/* User area */}
      <NavLink
        to="/settings/profile"
        className="flex items-center space-x-3 px-4 pb-4 mb-2 border-b border-slate-100/60 cursor-pointer group"
      >
        <img
          className="w-10 h-10 rounded-xl bg-indigo-50 object-cover group-hover:shadow-md transition-all"
          src={getAvatarUrl(avatar)}
          alt="avatar"
        />
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-800 truncate">Hi, {nickname}</p>
          <p className="text-[10px] text-slate-400 font-bold">今天也是进步的一天</p>
        </div>
      </NavLink>

      {/* Navigation */}
      <div className="px-3 space-y-0.5 mb-4">
        <SidebarNavItem to="/" icon="th-large" label="Dashboard" end />
        <SidebarNavItem to="/calendar" icon="calendar-alt" label="学习日历" />
      </div>

      {/* Projects section */}
      <div className="px-3 flex-1">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-[0.05em]">
            我的项目
          </span>
          <NavLink
            to="/create"
            className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:bg-white hover:text-indigo-500 transition-all text-xs"
          >
            <FontAwesomeIcon icon="plus" />
          </NavLink>
        </div>
        {projects && projects.length > 0 ? (
          <div className="space-y-0.5">
            {projects.map((p) => (
              <SidebarProjectItem key={p.id} projectId={p.id} goal={p.goal} planStatus={p.planStatus} />
            ))}
          </div>
        ) : (
          <div className="px-3 py-4 text-center">
            <p className="text-[11px] text-slate-300 font-bold">暂无项目</p>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="px-3 pt-2 mt-2 border-t border-slate-100/60">
        <NavLink
          to="/settings"
          className={`flex items-center py-[7px] px-3 rounded-lg cursor-pointer transition-all font-semibold text-[13px] gap-2.5 select-none ${
            isSettingsActive
              ? 'bg-white text-indigo-600 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
              : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
          }`}
        >
          <span className="w-5 text-center text-[13px]">
            <FontAwesomeIcon icon="cog" />
          </span>
          <span>设置</span>
        </NavLink>
      </div>
    </aside>
  );
}

function SidebarNavItem({ to, icon, label, end }: { to: string; icon: string; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center py-[7px] px-3 rounded-lg cursor-pointer transition-all font-semibold text-[13px] gap-2.5 select-none ${
          isActive
            ? 'bg-white text-indigo-600 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
            : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
        }`
      }
    >
      <span className="w-5 text-center text-[13px]">
        <FontAwesomeIcon icon={icon as never} />
      </span>
      <span>{label}</span>
    </NavLink>
  );
}

function SidebarProjectItem({
  projectId,
  goal,
  planStatus,
}: {
  projectId: string;
  goal: string;
  planStatus: string;
}) {
  const chapters = useChapters(projectId);
  const location = useLocation();
  const params = useParams();

  const isActive =
    location.pathname.startsWith(`/project/${projectId}`) ||
    params.projectId === projectId;

  const completed = chapters?.filter((c) => c.status === 'assessment_completed').length ?? 0;
  const total = chapters?.length ?? 0;
  const progress = calculateProgress(total, completed);

  let dotColor = '#e2e8f0';
  if (progress === 100) dotColor = '#22c55e';
  else if (progress > 0) dotColor = '#6366f1';
  else if (planStatus === 'ready') dotColor = '#cbd5e1';

  return (
    <NavLink
      to={`/project/${projectId}`}
      className={`flex items-center py-1.5 px-3 rounded-lg cursor-pointer transition-all font-semibold text-[13px] gap-2 select-none ${
        isActive
          ? 'bg-white text-indigo-600 shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
          : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
      }`}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: dotColor }}
      />
      <span className="truncate">{goal}</span>
    </NavLink>
  );
}
