import { Link } from "react-router-dom";
import { useSettingsStore } from "@/stores/settingsStore";

export default function LLMGuard() {
  const isConfigured = useSettingsStore((s) => s.isConfigured);

  if (isConfigured) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
      <span className="text-lg">⚠️</span>
      <p className="flex-1 text-sm text-amber-800">
        未配置 AI 服务，请先前往设置页面配置
      </p>
      <Link
        to="/settings"
        className="shrink-0 rounded-xl bg-amber-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-600"
      >
        前往设置
      </Link>
    </div>
  );
}
