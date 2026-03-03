import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanStore } from "@/stores/planStore";
import { useSettingsStore } from "@/stores/settingsStore";

interface GeneratePlanButtonProps {
  projectId: number;
}

export default function GeneratePlanButton({ projectId }: GeneratePlanButtonProps) {
  const navigate = useNavigate();
  const { isGenerating, progressMessage, error, generatePlan } = usePlanStore();
  const { isConfigured } = useSettingsStore();

  const handleClick = async () => {
    if (!isConfigured) {
      navigate("/settings");
      return;
    }
    await generatePlan(projectId);
  };

  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <div className="text-center">
        <p className="text-4xl mb-3">{"\uD83D\uDCDD"}</p>
        <p className="text-sm text-gray-500 mb-1">
          还没有学习计划
        </p>
        <p className="text-xs text-gray-400">
          点击下方按钮，AI 将为你量身定制学习路径
        </p>
      </div>

      <Button
        onClick={handleClick}
        disabled={isGenerating}
        className="rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white px-6 h-10 transition-all"
      >
        {isGenerating ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            生成中...
          </>
        ) : (
          <>
            <Sparkles className="size-4" />
            生成学习计划
          </>
        )}
      </Button>

      {isGenerating && progressMessage && (
        <p className="text-sm text-indigo-500 animate-pulse text-center max-w-xs">
          {progressMessage}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500 text-center max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}
