import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { QuestionItem } from "@/types";

interface AssessmentFormProps {
  questions: QuestionItem[];
  onSubmit: (answers: string[]) => void;
}

export default function AssessmentForm({
  questions,
  onSubmit,
}: AssessmentFormProps) {
  const [answers, setAnswers] = useState<string[]>(
    () => new Array(questions.length).fill("")
  );

  const updateAnswer = (index: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answers);
  };

  const allAnswered = answers.every((a) => a.trim() !== "");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {questions.map((q, idx) => (
        <Card key={idx}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                {idx + 1}
              </span>
              <p className="text-base font-medium leading-7 pt-0.5">
                {q.question}
              </p>
            </div>

            {q.type === "choice" && q.options && (
              <div className="ml-10 space-y-2">
                {q.options.map((option, optIdx) => {
                  const optionLabel = String.fromCharCode(65 + optIdx);
                  const isSelected = answers[idx] === optionLabel;
                  return (
                    <Label
                      key={optIdx}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${idx}`}
                        value={optionLabel}
                        checked={isSelected}
                        onChange={() => updateAnswer(idx, optionLabel)}
                        className="w-4 h-4 text-primary accent-primary"
                      />
                      <span className="text-sm font-medium text-muted-foreground">
                        {optionLabel}.
                      </span>
                      <span className="text-sm">{option}</span>
                    </Label>
                  );
                })}
              </div>
            )}

            {q.type === "fill_blank" && (
              <div className="ml-10">
                <Input
                  value={answers[idx]}
                  onChange={(e) => updateAnswer(idx, e.target.value)}
                  placeholder="请输入你的答案..."
                  className="max-w-md"
                />
              </div>
            )}

            {q.type === "short_answer" && (
              <div className="ml-10">
                <Textarea
                  value={answers[idx]}
                  onChange={(e) => updateAnswer(idx, e.target.value)}
                  placeholder="请输入你的答案..."
                  rows={4}
                  className="resize-y"
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end pt-2">
        <Button type="submit" size="lg" disabled={!allAnswered}>
          提交答案
        </Button>
      </div>
    </form>
  );
}
