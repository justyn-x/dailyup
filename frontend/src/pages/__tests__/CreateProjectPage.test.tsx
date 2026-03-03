import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CreateProjectPage from "@/pages/CreateProjectPage";
import { useProjectStore } from "@/stores/projectStore";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <CreateProjectPage />
    </MemoryRouter>,
  );
}

describe("CreateProjectPage", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    useProjectStore.setState({
      projects: [],
      currentProject: null,
      loading: false,
      error: null,
    });
  });

  it("renders the page with form fields", () => {
    renderPage();

    expect(screen.getByText("新建学习项目")).toBeInTheDocument();
    expect(screen.getByLabelText(/学习目标/)).toBeInTheDocument();
    expect(screen.getByLabelText(/学习背景/)).toBeInTheDocument();
    expect(screen.getByLabelText(/已有技能/)).toBeInTheDocument();
  });

  it("shows error when submitting empty goal", async () => {
    const user = userEvent.setup();
    renderPage();

    const submitBtn = screen.getByRole("button", { name: "创建项目" });
    await user.click(submitBtn);

    expect(screen.getByText("请输入学习目标")).toBeInTheDocument();
  });

  it("shows error when submitting whitespace-only goal", async () => {
    const user = userEvent.setup();
    renderPage();

    const goalInput = screen.getByLabelText(/学习目标/);
    await user.type(goalInput, "   ");

    const submitBtn = screen.getByRole("button", { name: "创建项目" });
    await user.click(submitBtn);

    expect(screen.getByText("请输入学习目标")).toBeInTheDocument();
  });

  it("clears error when user starts typing after validation error", async () => {
    const user = userEvent.setup();
    renderPage();

    // Trigger validation error
    const submitBtn = screen.getByRole("button", { name: "创建项目" });
    await user.click(submitBtn);
    expect(screen.getByText("请输入学习目标")).toBeInTheDocument();

    // Start typing
    const goalInput = screen.getByLabelText(/学习目标/);
    await user.type(goalInput, "L");

    expect(screen.queryByText("请输入学习目标")).not.toBeInTheDocument();
  });

  it("navigates to project detail on successful submission", async () => {
    const user = userEvent.setup();

    const mockCreateProject = vi.fn().mockResolvedValue({
      id: 99,
      goal: "Learn Python",
      background: "",
      skills: "",
      progress: 0,
      created_at: "2025-01-01T00:00:00Z",
    });

    useProjectStore.setState({
      loading: false,
      error: null,
      createProject: mockCreateProject,
    } as unknown as ReturnType<typeof useProjectStore.getState>);

    renderPage();

    const goalInput = screen.getByLabelText(/学习目标/);
    await user.type(goalInput, "Learn Python");

    const submitBtn = screen.getByRole("button", { name: "创建项目" });
    await user.click(submitBtn);

    expect(mockCreateProject).toHaveBeenCalledWith({
      goal: "Learn Python",
      background: "",
      skills: "",
    });
    expect(mockNavigate).toHaveBeenCalledWith("/projects/99");
  });

  it("navigates back when cancel button is clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    const cancelBtn = screen.getByRole("button", { name: "取消" });
    await user.click(cancelBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
