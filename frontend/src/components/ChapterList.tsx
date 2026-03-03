import { useNavigate } from "react-router-dom";
import type { ChapterSummary } from "@/types";
import { Separator } from "@/components/ui/separator";

interface ChapterListProps {
  chapters: ChapterSummary[];
}

function statusIcon(status: string): string {
  switch (status) {
    case "completed":
      return "\u2705";
    case "learning":
      return "\uD83D\uDCDA";
    default:
      return "\uD83D\uDD12";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "completed":
      return "已完成";
    case "learning":
      return "学习中";
    default:
      return "未开始";
  }
}

export default function ChapterList({ chapters }: ChapterListProps) {
  const navigate = useNavigate();

  if (chapters.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">暂无章节</p>
    );
  }

  const sorted = [...chapters].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      {sorted.map((chapter, idx) => (
        <div key={chapter.id}>
          {idx > 0 && <Separator />}
          <button
            type="button"
            onClick={() => navigate(`/chapters/${chapter.id}`)}
            className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-indigo-50/60"
          >
            {/* Status icon */}
            <span className="text-xl leading-none" aria-hidden="true">
              {statusIcon(chapter.status)}
            </span>

            {/* Chapter info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                第{chapter.order_index}章 {chapter.title}
              </p>
              {chapter.objective && (
                <p className="mt-0.5 text-xs text-gray-500 truncate">
                  {chapter.objective}
                </p>
              )}
            </div>

            {/* Score or status label */}
            <span className="shrink-0 text-sm text-gray-500">
              {chapter.status === "completed" && chapter.score != null
                ? `得分 ${chapter.score}%`
                : statusLabel(chapter.status)}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
