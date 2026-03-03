import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ProjectCard from "@/components/ProjectCard";
import type { Project } from "@/types";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockProject: Project = {
  id: 42,
  goal: "Master React Testing",
  background: "Some experience",
  skills: "JavaScript",
  progress: 65,
  created_at: "2025-01-01T00:00:00Z",
};

function renderProjectCard(project: Project = mockProject) {
  return render(
    <MemoryRouter>
      <ProjectCard project={project} />
    </MemoryRouter>,
  );
}

describe("ProjectCard", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders project goal", () => {
    renderProjectCard();
    expect(screen.getByText("Master React Testing")).toBeInTheDocument();
  });

  it("renders progress percentage", () => {
    renderProjectCard();
    expect(screen.getByText("65%")).toBeInTheDocument();
  });

  it("renders progress bar with correct width", () => {
    const { container } = renderProjectCard();
    const progressBar = container.querySelector(
      '[style*="width: 65%"]',
    );
    expect(progressBar).toBeInTheDocument();
  });

  it("renders '未开始' when progress is 0", () => {
    renderProjectCard({ ...mockProject, progress: 0 });
    expect(screen.getByText("未开始")).toBeInTheDocument();
  });

  it("renders '已完成 X%' when progress > 0", () => {
    renderProjectCard();
    expect(screen.getByText("已完成 65%")).toBeInTheDocument();
  });

  it("navigates to project detail on click", async () => {
    const user = userEvent.setup();
    renderProjectCard();

    const card = screen.getByText("Master React Testing").closest("[class*='cursor-pointer']");
    expect(card).toBeTruthy();
    await user.click(card!);

    expect(mockNavigate).toHaveBeenCalledWith("/projects/42");
  });

  it("rounds progress percentage", () => {
    renderProjectCard({ ...mockProject, progress: 33.7 });
    expect(screen.getByText("34%")).toBeInTheDocument();
  });
});
