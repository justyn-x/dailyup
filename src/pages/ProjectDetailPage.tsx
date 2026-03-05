import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useProject } from '../hooks/useProjects';
import { useChapters } from '../hooks/useChapters';
import { useLLMConfigStore } from '../stores/llmConfigStore';
import { db } from '../db';
import { generateId, calculateProgress } from '../lib/utils';
import { generatePlan } from '../services/ai';
import { ProgressBar } from '../components/ui/ProgressBar';
import { LoadingBrain } from '../components/ui/LoadingBrain';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const chapters = useChapters(projectId);
  const llmConfig = useLLMConfigStore();

  const handleGeneratePlan = useCallback(async () => {
    if (!project || !projectId) return;

    await db.projects.update(projectId, { planStatus: 'generating' });

    try {
      const plan = await generatePlan(
        { baseUrl: llmConfig.baseUrl, apiKey: llmConfig.apiKey, model: llmConfig.model },
        project.goal,
        project.background,
        project.skills,
      );

      if (!plan || !plan.chapters || plan.chapters.length === 0) {
        await db.projects.update(projectId, { planStatus: 'failed' });
        return;
      }

      const chapterRecords = plan.chapters.map((ch, idx) => ({
        id: generateId(),
        projectId,
        orderIndex: idx,
        title: ch.title,
        summary: ch.summary,
        status: 'not_started' as const,
        material: null,
        assessment: null,
      }));

      await db.chapters.bulkAdd(chapterRecords);
      await db.projects.update(projectId, { planStatus: 'ready' });
    } catch (err) {
      console.error('Plan generation failed:', err);
      await db.projects.update(projectId, { planStatus: 'failed' });
    }
  }, [project, projectId, llmConfig]);

  if (!project) {
    return <div className="text-slate-400 text-center py-10">加载中...</div>;
  }

  const completed = chapters?.filter((c) => c.status === 'assessment_completed').length ?? 0;
  const total = chapters?.length ?? 0;
  const progress = calculateProgress(total, completed);

  return (
    <div className="max-w-[720px] mx-auto">
      <header className="flex items-center mb-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <FontAwesomeIcon icon="arrow-left" />
        </button>
        <h2 className="ml-2 text-lg font-extrabold text-slate-900 truncate">{project.goal}</h2>
      </header>

      {/* Progress section for ready state */}
      {project.planStatus === 'ready' && total > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-500">
              <FontAwesomeIcon icon="chart-line" className="mr-1" />
              学习进度
            </span>
            <span className="text-xs font-extrabold text-indigo-600">
              {completed}/{total} 章节
            </span>
          </div>
          <ProgressBar progress={progress} />
        </div>
      )}

      {/* Pending state */}
      {project.planStatus === 'pending' && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <FontAwesomeIcon icon="wand-magic-sparkles" className="text-3xl text-indigo-400" />
          </div>
          <p className="text-sm font-bold text-slate-700 mb-2">准备好生成学习计划了吗？</p>
          <p className="text-xs text-slate-400 mb-6">AI 将根据你的目标和背景定制专属计划</p>
          <button
            onClick={handleGeneratePlan}
            disabled={!llmConfig.isConfigured()}
            className="bg-indigo-600 text-white font-bold text-sm px-8 py-3.5 rounded-xl transition-all hover:opacity-90 hover:-translate-y-px hover:shadow-lg active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon icon="brain" className="mr-2" />
            生成学习计划
          </button>
          {!llmConfig.isConfigured() && (
            <p className="text-xs text-amber-500 font-bold mt-3">
              请先前往设置配置 AI 模型
            </p>
          )}
        </div>
      )}

      {/* Generating state */}
      {project.planStatus === 'generating' && (
        <LoadingBrain
          messages={['正在分析你的学习目标...', '根据背景定制难度...', '生成章节结构...', '优化学习路径...']}
          subtitle="AI 正在为你定制学习计划"
        />
      )}

      {/* Failed state */}
      {project.planStatus === 'failed' && (
        <ErrorDisplay
          message="学习计划生成失败，请检查 AI 配置后重试"
          onRetry={handleGeneratePlan}
        />
      )}

      {/* Ready state — chapter list */}
      {project.planStatus === 'ready' && chapters && (
        <div className="space-y-3">
          {chapters.map((ch, idx) => (
            <ChapterListItem
              key={ch.id}
              index={idx}
              chapterId={ch.id}
              projectId={projectId!}
              title={ch.title}
              summary={ch.summary}
              status={ch.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChapterListItem({
  index,
  chapterId,
  projectId,
  title,
  summary,
  status,
}: {
  index: number;
  chapterId: string;
  projectId: string;
  title: string;
  summary: string;
  status: string;
}) {
  const navigate = useNavigate();

  let statusIcon = 'circle';
  let statusColor = 'text-slate-300';
  let borderColor = 'border-slate-100';

  if (status === 'learning') {
    statusIcon = 'play-circle';
    statusColor = 'text-indigo-500';
    borderColor = 'border-indigo-100';
  } else if (status === 'assessment_completed') {
    statusIcon = 'check-circle';
    statusColor = 'text-green-500';
    borderColor = 'border-green-100';
  }

  function handleClick() {
    if (status === 'assessment_completed') {
      navigate(`/project/${projectId}/chapter/${chapterId}/assessment`);
    } else {
      navigate(`/project/${projectId}/chapter/${chapterId}/material`);
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-2xl p-5 border ${borderColor} cursor-pointer transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-indigo-200`}
    >
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center pt-0.5">
          <span className="text-[10px] font-extrabold text-slate-300 mb-1">
            {String(index + 1).padStart(2, '0')}
          </span>
          <FontAwesomeIcon icon={statusIcon as never} className={`text-lg ${statusColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-extrabold text-slate-800 mb-1">{title}</h4>
          <p className="text-xs text-slate-400 font-bold">{summary}</p>
        </div>
        <FontAwesomeIcon icon="chevron-right" className="text-slate-300 text-xs mt-1 shrink-0" />
      </div>
    </div>
  );
}
