import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import { useProjectStore } from "@/stores/projectStore";

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const { createProject, loading } = useProjectStore();

  const [goal, setGoal] = useState("");
  const [background, setBackground] = useState("");
  const [skills, setSkills] = useState("");
  const [goalError, setGoalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedGoal = goal.trim();
    if (!trimmedGoal) {
      setGoalError("请输入学习目标");
      return;
    }
    setGoalError("");

    try {
      const project = await createProject({
        goal: trimmedGoal,
        background: background.trim(),
        skills: skills.trim(),
      });
      navigate(`/projects/${project.id}`);
    } catch {
      // error is handled by the store
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header back={{ label: "返回首页", to: "/" }} />

      <main className="mx-auto max-w-2xl px-6 py-8">
        <h2 className="text-xl font-bold text-gray-800">新建学习项目</h2>
        <p className="mt-1 text-sm text-gray-400">
          描述你想学习的内容，AI 将为你生成个性化学习计划
        </p>

        <Card className="mt-6 rounded-2xl border-0 shadow-sm">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="goal" className="text-sm font-medium text-gray-700">
                  学习目标 <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="goal"
                  placeholder="例如：掌握 Python 基础语法和常用标准库，能独立完成简单脚本开发"
                  value={goal}
                  onChange={(e) => {
                    setGoal(e.target.value);
                    if (goalError) setGoalError("");
                  }}
                  className="min-h-24 rounded-xl"
                  aria-invalid={!!goalError}
                />
                {goalError && (
                  <p className="text-sm text-red-500">{goalError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="background" className="text-sm font-medium text-gray-700">
                  学习背景
                  <span className="ml-1 text-xs font-normal text-gray-400">
                    (选填)
                  </span>
                </Label>
                <Textarea
                  id="background"
                  placeholder="例如：有一些 JavaScript 基础，了解基本的编程概念"
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="min-h-20 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills" className="text-sm font-medium text-gray-700">
                  已有技能
                  <span className="ml-1 text-xs font-normal text-gray-400">
                    (选填)
                  </span>
                </Label>
                <Textarea
                  id="skills"
                  placeholder="例如：熟悉 Git 版本控制、了解 HTML/CSS"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="min-h-20 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => navigate("/")}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-indigo-500 px-6 hover:bg-indigo-600"
                >
                  {loading ? "创建中..." : "创建项目"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
