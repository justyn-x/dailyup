import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";
import type { AssessmentResult as AssessmentResultType } from "@/types";

interface AssessmentResultProps {
  result: AssessmentResultType;
}

export default function AssessmentResult({ result }: AssessmentResultProps) {
  const scorePercent = Math.round(result.score * 100);
  const passed = result.score >= 0.8;

  useEffect(() => {
    if (passed) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [passed]);

  return (
    <div className="space-y-6">
      {/* Score display */}
      <div className="text-center py-8">
        <div
          className={`text-6xl font-bold mb-2 ${
            passed ? "text-green-600" : "text-red-500"
          }`}
        >
          {scorePercent}%
        </div>
        <p className="text-muted-foreground text-lg">
          {passed ? "恭喜通过考核！" : "继续加油，再接再厉！"}
        </p>
        <div className="mt-2">
          <Badge variant={passed ? "default" : "destructive"}>
            {result.results.filter((r) => r.correct).length} /{" "}
            {result.results.length} 题正确
          </Badge>
        </div>
      </div>

      {/* Per-question results */}
      <div className="space-y-4">
        {result.questions.map((q, idx) => {
          const r = result.results[idx];
          const userAnswer = result.user_answers[idx];
          const isCorrect = r.correct;

          return (
            <Card
              key={idx}
              className={`border-l-4 ${
                isCorrect ? "border-l-green-500" : "border-l-red-500"
              }`}
            >
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-0.5">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </span>
                  <div className="space-y-2 flex-1">
                    <p className="font-medium">{q.question}</p>

                    <div className="text-sm space-y-1">
                      <p>
                        <span className="text-muted-foreground">你的答案：</span>
                        <span
                          className={
                            isCorrect
                              ? "text-green-600 font-medium"
                              : "text-red-500 font-medium"
                          }
                        >
                          {userAnswer || "(未作答)"}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p>
                          <span className="text-muted-foreground">
                            正确答案：
                          </span>
                          <span className="text-green-600 font-medium">
                            {r.correct_answer}
                          </span>
                        </p>
                      )}
                    </div>

                    {r.explanation && (
                      <div className="mt-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          解析：
                        </span>
                        {r.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
