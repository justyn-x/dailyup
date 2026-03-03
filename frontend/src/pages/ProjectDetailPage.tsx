import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProgressRing from "@/components/ProgressRing";
import ChapterList from "@/components/ChapterList";
import GeneratePlanButton from "@/components/GeneratePlanButton";
import DeleteConfirmDialog from "@/components/DeleteConfirmDialog";
import { useProjectStore } from "@/stores/projectStore";
import { usePlanStore } from "@/stores/planStore";
import { useSettingsStore } from "@/stores/settingsStore";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = Number(id);

  const { currentProject, fetchProject, deleteProject } = useProjectStore();
  const { plan, isGenerating, progressMessage, fetchPlan, reset: resetPlan } = usePlanStore();
  const { fetchSettings } = useSettingsStore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch project, plan, and settings on mount
  useEffect(() => {
    if (!projectId || isNaN(projectId)) return;

    fetchProject(projectId);
    fetchPlan(projectId);
    fetchSettings();

    return () => {
      resetPlan();
    };
  }, [projectId, fetchProject, fetchPlan, fetchSettings, resetPlan]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProject(projectId);
      navigate("/");
    } catch {
      setIsDeleting(false);
    }
  };

  // Loading state
  if (!currentProject) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <p className="text-sm text-gray-400">加载中...</p>
      </div>
    );
  }

  const progress = currentProject.progress ?? 0;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="mx-auto max-w-2xl flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            aria-label="返回首页"
          >
            <ArrowLeft className="size-5 text-gray-600" />
          </Button>

          <h1 className="flex-1 min-w-0 text-lg font-semibold text-gray-800 truncate">
            {currentProject.goal}
          </h1>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isDeleting}
            aria-label="删除项目"
          >
            <Trash2 className="size-5 text-gray-400 hover:text-red-500 transition-colors" />
          </Button>

          <ProgressRing percentage={progress} />
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {/* Project info card */}
        <section className="rounded-2xl bg-white shadow-sm p-5 space-y-3">
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-1">
              {"\uD83C\uDFAF"} 学习目标
            </h2>
            <p className="text-gray-800">{currentProject.goal}</p>
          </div>

          {currentProject.background && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-1">
                专业背景
              </h2>
              <p className="text-sm text-gray-600">{currentProject.background}</p>
            </div>
          )}

          {currentProject.skills && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-1">
                已有技能
              </h2>
              <p className="text-sm text-gray-600">{currentProject.skills}</p>
            </div>
          )}
        </section>

        {/* Plan section */}
        <section>
          {plan ? (
            <>
              <h2 className="text-base font-semibold text-gray-800 mb-3">
                章节列表
              </h2>
              <ChapterList chapters={plan.chapters} />
            </>
          ) : isGenerating ? (
            <div className="rounded-2xl bg-white shadow-sm p-8 flex flex-col items-center gap-3">
              <div className="size-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <p className="text-sm text-indigo-500 animate-pulse text-center">
                {progressMessage || "正在生成学习计划..."}
              </p>
            </div>
          ) : (
            <GeneratePlanButton projectId={projectId} />
          )}
        </section>
      </main>

      {/* Delete dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
}
