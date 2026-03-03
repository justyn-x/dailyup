import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AssessmentForm from "@/components/AssessmentForm";
import type { QuestionItem } from "@/types";

const choiceQuestion: QuestionItem = {
  type: "choice",
  question: "What is 2 + 2?",
  options: ["Three", "Four", "Five", "Six"],
  correct_answer: "B",
};

const fillBlankQuestion: QuestionItem = {
  type: "fill_blank",
  question: "The capital of France is ___.",
  correct_answer: "Paris",
};

const shortAnswerQuestion: QuestionItem = {
  type: "short_answer",
  question: "Explain the concept of closures.",
  correct_answer: "A closure is a function that captures variables from its surrounding scope.",
};

describe("AssessmentForm", () => {
  it("renders choice questions with radio buttons", () => {
    const onSubmit = vi.fn();
    render(
      <AssessmentForm questions={[choiceQuestion]} onSubmit={onSubmit} />,
    );

    expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(4);
    expect(screen.getByText("Three")).toBeInTheDocument();
    expect(screen.getByText("Four")).toBeInTheDocument();
    expect(screen.getByText("Five")).toBeInTheDocument();
    expect(screen.getByText("Six")).toBeInTheDocument();
  });

  it("renders fill_blank question with input field", () => {
    const onSubmit = vi.fn();
    render(
      <AssessmentForm questions={[fillBlankQuestion]} onSubmit={onSubmit} />,
    );

    expect(
      screen.getByText("The capital of France is ___."),
    ).toBeInTheDocument();
    const input = screen.getByPlaceholderText("请输入你的答案...");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("renders short_answer question with textarea", () => {
    const onSubmit = vi.fn();
    render(
      <AssessmentForm questions={[shortAnswerQuestion]} onSubmit={onSubmit} />,
    );

    expect(
      screen.getByText("Explain the concept of closures."),
    ).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText("请输入你的答案...");
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("submit button is disabled until all questions are answered", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AssessmentForm
        questions={[choiceQuestion, fillBlankQuestion]}
        onSubmit={onSubmit}
      />,
    );

    const submitBtn = screen.getByRole("button", { name: "提交答案" });
    expect(submitBtn).toBeDisabled();

    // Answer the choice question
    const firstRadio = screen.getAllByRole("radio")[1]; // option B
    await user.click(firstRadio);

    // Still disabled because fill_blank is unanswered
    expect(submitBtn).toBeDisabled();

    // Answer the fill_blank question
    const input = screen.getByPlaceholderText("请输入你的答案...");
    await user.type(input, "Paris");

    // Now should be enabled
    expect(submitBtn).toBeEnabled();
  });

  it("calls onSubmit with answers when form is submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <AssessmentForm
        questions={[choiceQuestion, fillBlankQuestion]}
        onSubmit={onSubmit}
      />,
    );

    // Select option B for choice
    const secondRadio = screen.getAllByRole("radio")[1];
    await user.click(secondRadio);

    // Type answer for fill_blank
    const input = screen.getByPlaceholderText("请输入你的答案...");
    await user.type(input, "Paris");

    // Submit
    const submitBtn = screen.getByRole("button", { name: "提交答案" });
    await user.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith(["B", "Paris"]);
  });

  it("renders mixed question types correctly", () => {
    const onSubmit = vi.fn();
    render(
      <AssessmentForm
        questions={[choiceQuestion, fillBlankQuestion, shortAnswerQuestion]}
        onSubmit={onSubmit}
      />,
    );

    // All questions render their text
    expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
    expect(
      screen.getByText("The capital of France is ___."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Explain the concept of closures."),
    ).toBeInTheDocument();

    // Check question numbers are rendered (use getAllByText to handle duplicates)
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    // "3" may also appear as a choice option text, so use getAllByText
    const threes = screen.getAllByText("3");
    expect(threes.length).toBeGreaterThanOrEqual(1);
  });
});
