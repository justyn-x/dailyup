import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLiveQuery } from 'dexie-react-hooks';
import { useProjects } from '../hooks/useProjects';
import { useChapters } from '../hooks/useChapters';
import { useLLMConfigStore } from '../stores/llmConfigStore';
import { calculateProgress } from '../lib/utils';
import { ProgressBar } from '../components/ui/ProgressBar';
import { db } from '../db';

export function DashboardPage() {
  const projects = useProjects();
  const isConfigured = useLLMConfigStore((s) => s.isConfigured);
  const navigate = useNavigate();

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Hero card */}
      <div className="relative mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[2rem] p-8 text-white shadow-lg shadow-indigo-200/50 text-center">
          <p className="text-[10px] font-extrabold opacity-70 uppercase tracking-widest mb-4">
            学习进度总览
          </p>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
              <FontAwesomeIcon icon="trophy" className="text-3xl text-yellow-300" />
            </div>
            <CompletedCount />
            <p className="text-xs opacity-70 mb-4">章节已完成</p>
            <button
              onClick={() => navigate('/calendar')}
              className="bg-white/20 backdrop-blur-md px-6 py-2.5 rounded-full text-[10px] font-extrabold hover:bg-white/30 transition-colors"
            >
              查看学习日历
            </button>
          </div>
        </div>
      </div>

      {/* LLM banner */}
      {!isConfigured() && (
        <div className="mb-6">
          <Link
            to="/settings/llm"
            className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-[1.5rem] p-4 flex items-center space-x-3 cursor-pointer hover:shadow-md transition-all"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon="exclamation-triangle" className="text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800">AI 模型未配置</p>
              <p className="text-[11px] text-slate-400 font-bold">前往设置配置 API 以获得完整体验</p>
            </div>
            <FontAwesomeIcon icon="chevron-right" className="text-amber-400 text-xs shrink-0" />
          </Link>
        </div>
      )}

      {/* Project list header */}
      <div className="flex justify-between items-center mb-5 px-1">
        <h3 className="text-lg font-extrabold text-slate-900">进行中的项目</h3>
        <button
          onClick={() => navigate('/create')}
          className="text-indigo-500 font-bold text-xs flex items-center hover:text-indigo-700 transition-colors"
        >
          <FontAwesomeIcon icon="plus" className="mr-1" /> 新建项目
        </button>
      </div>

      {/* Projects grid */}
      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} projectId={p.id} goal={p.goal} planStatus={p.planStatus} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FontAwesomeIcon icon="book-open" className="text-3xl text-slate-300" />
          </div>
          <p className="text-slate-400 font-bold text-sm">还没有学习项目</p>
          <p className="text-slate-300 text-xs mt-1">点击侧边栏 + 创建你的第一个计划</p>
        </div>
      )}
    </div>
  );
}

function CompletedCount() {
  const count = useLiveQuery(
    () => db.chapters.where('status').equals('assessment_completed').count(),
    [],
  );
  return (
    <span className="text-5xl font-extrabold mb-2 italic">
      {count ?? 0}
    </span>
  );
}

function ProjectCard({
  projectId,
  goal,
  planStatus,
}: {
  projectId: string;
  goal: string;
  planStatus: string;
}) {
  const chapters = useChapters(projectId);
  const navigate = useNavigate();

  const completed = chapters?.filter((c) => c.status === 'assessment_completed').length ?? 0;
  const total = chapters?.length ?? 0;
  const progress = calculateProgress(total, completed);

  let statusText = '';
  let statusColor = 'text-slate-400';
  if (planStatus === 'pending') {
    statusText = '待生成计划';
  } else if (planStatus === 'generating') {
    statusText = '生成中...';
    statusColor = 'text-indigo-500';
  } else if (planStatus === 'failed') {
    statusText = '生成失败';
    statusColor = 'text-red-400';
  } else {
    statusText = `${completed}/${total} 章节完成`;
    statusColor = progress === 100 ? 'text-green-500' : 'text-indigo-500';
  }

  return (
    <div
      onClick={() => navigate(`/project/${projectId}`)}
      className="bg-white rounded-[1.5rem] p-5 border border-slate-100 cursor-pointer transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-indigo-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
          <FontAwesomeIcon icon="book" className="text-indigo-400" />
        </div>
        <span className={`text-[10px] font-bold ${statusColor}`}>{statusText}</span>
      </div>
      <h4 className="text-sm font-extrabold text-slate-800 mb-3 line-clamp-2">{goal}</h4>
      {planStatus === 'ready' && (
        <>
          <ProgressBar progress={progress} />
          <p className="text-right text-[10px] font-bold text-slate-400 mt-1.5">{progress}%</p>
        </>
      )}
    </div>
  );
}
