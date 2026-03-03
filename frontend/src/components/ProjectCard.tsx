import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/types";

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();
  const progress = Math.round(project.progress);

  return (
    <Card
      className="cursor-pointer rounded-2xl border-0 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex items-start justify-between">
          <span className="text-2xl">📚</span>
          <Badge
            variant="secondary"
            className="rounded-lg bg-indigo-50 text-xs text-indigo-600"
          >
            {progress}%
          </Badge>
        </div>

        <div>
          <h3 className="line-clamp-2 text-base font-semibold text-gray-800">
            {project.goal}
          </h3>
        </div>

        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">
            {progress === 0 ? "未开始" : `已完成 ${progress}%`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
