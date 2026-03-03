import { render, screen } from "@testing-library/react";
import * as fc from "fast-check";
import ProgressRing from "@/components/ProgressRing";

describe("ProgressRing", () => {
  it("renders SVG element", () => {
    const { container } = render(<ProgressRing percentage={50} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders percentage text", () => {
    render(<ProgressRing percentage={75} />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("clamps percentage to 0-100 range for display", () => {
    const { rerender } = render(<ProgressRing percentage={-10} />);
    expect(screen.getByText("0%")).toBeInTheDocument();

    rerender(<ProgressRing percentage={150} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("renders with custom size", () => {
    const { container } = render(
      <ProgressRing percentage={50} size={100} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "100");
    expect(svg).toHaveAttribute("height", "100");
  });

  it("renders two circles (background track and progress arc)", () => {
    const { container } = render(<ProgressRing percentage={50} />);
    const circles = container.querySelectorAll("circle");
    expect(circles).toHaveLength(2);
  });

  // Feature: dailyup-learning-app, Property: progress percentage display matches input
  it("property: displayed percentage matches clamped and rounded input for any number", () => {
    fc.assert(
      fc.property(fc.double({ min: -200, max: 300, noNaN: true }), (value) => {
        const { container } = render(<ProgressRing percentage={value} />);
        const clamped = Math.min(100, Math.max(0, value));
        const expected = `${Math.round(clamped)}%`;
        const label = container.querySelector("span");
        expect(label?.textContent).toBe(expected);
        // Clean up for next iteration
        container.remove();
      }),
      { numRuns: 100 },
    );
  });

  // Feature: dailyup-learning-app, Property: SVG always renders for any valid percentage
  it("property: SVG is always rendered for any percentage", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (value) => {
        const { container } = render(<ProgressRing percentage={value} />);
        const svg = container.querySelector("svg");
        expect(svg).toBeInTheDocument();
        container.remove();
      }),
      { numRuns: 100 },
    );
  });
});
