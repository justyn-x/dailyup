import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "@/components/Header";

function renderHeader(props: { back?: { label: string; to: string } } = {}) {
  return render(
    <MemoryRouter>
      <Header {...props} />
    </MemoryRouter>,
  );
}

describe("Header", () => {
  it("renders DailyUp title when no back prop", () => {
    renderHeader();
    expect(screen.getByText("DailyUp")).toBeInTheDocument();
  });

  it("renders settings link", () => {
    renderHeader();
    const settingsLink = screen.getByLabelText("Settings");
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute("href", "/settings");
  });

  it("renders back navigation when back prop is provided", () => {
    renderHeader({ back: { label: "返回首页", to: "/" } });

    const backLink = screen.getByText("返回首页");
    expect(backLink).toBeInTheDocument();
    // DailyUp title should NOT be visible when back is provided
    expect(screen.queryByText("DailyUp")).not.toBeInTheDocument();
  });

  it("back link points to the correct route", () => {
    renderHeader({ back: { label: "Go Back", to: "/projects/1" } });

    const backLink = screen.getByText("Go Back").closest("a");
    expect(backLink).toHaveAttribute("href", "/projects/1");
  });

  it("always renders settings link even with back prop", () => {
    renderHeader({ back: { label: "Back", to: "/" } });
    expect(screen.getByLabelText("Settings")).toBeInTheDocument();
  });
});
