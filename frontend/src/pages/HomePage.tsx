import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import ProjectCard from "@/components/ProjectCard";
import LLMGuard from "@/components/LLMGuard";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";

export default function HomePage() {
  const { projects, loading, fetchProjects } = useProjectStore();
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);

  useEffect(() => {
    fetchProjects();
    fetchSettings();
  }, [fetchProjects, fetchSettings]);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <LLMGuard />

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">我的学习项目</h2>
          <Button
            asChild
            className="rounded-xl bg-indigo-500 px-5 hover:bg-indigo-600"
          >
            <Link to="/projects/new">+ 新建项目</Link>
          </Button>
        </div>

        {loading && projects.length === 0 ? (
          <div className="mt-20 flex flex-col items-center justify-center gap-2 text-gray-400">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-500" />
            <p className="text-sm">加载中...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-20 flex flex-col items-center justify-center gap-4 text-center">
            <span className="text-5xl">📖</span>
            <h3 className="text-lg font-semibold text-gray-700">
              还没有学习项目
            </h3>
            <p className="text-sm text-gray-400">
              点击「新建项目」开始你的第一个学习计划吧
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
