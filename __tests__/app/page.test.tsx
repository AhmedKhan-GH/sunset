import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Home from "@/app/page";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

afterEach(() => {
  cleanup();
});

describe("Home page", () => {
  it("renders the heading", () => {
    render(<Home />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeDefined();
    expect(heading.textContent).toBe(
      "To get started, edit the page.tsx file.",
    );
  });

  it("renders the Next.js logo", () => {
    render(<Home />);
    const logo = screen.getByAltText("Next.js logo");
    expect(logo).toBeDefined();
    expect(logo.getAttribute("src")).toBe("/next.svg");
  });

  it("renders the Deploy Now link with security attributes", () => {
    render(<Home />);
    const deployLink = screen.getByText("Deploy Now");
    expect(deployLink).toBeDefined();
    expect(deployLink.closest("a")?.getAttribute("target")).toBe("_blank");
    expect(deployLink.closest("a")?.getAttribute("rel")).toBe(
      "noopener noreferrer",
    );
  });

  it("renders the Documentation link", () => {
    render(<Home />);
    const docsLink = screen.getByText("Documentation");
    expect(docsLink).toBeDefined();
    expect(docsLink.closest("a")?.getAttribute("target")).toBe("_blank");
    expect(docsLink.closest("a")?.getAttribute("href")).toContain(
      "nextjs.org/docs",
    );
  });

  it("renders the Templates link", () => {
    render(<Home />);
    const templatesLink = screen.getByText("Templates");
    expect(templatesLink).toBeDefined();
    expect(templatesLink.closest("a")?.getAttribute("href")).toContain(
      "vercel.com/templates",
    );
  });

  it("renders the Learning center link", () => {
    render(<Home />);
    const learningLink = screen.getByText("Learning");
    expect(learningLink).toBeDefined();
    expect(learningLink.closest("a")?.getAttribute("href")).toContain(
      "nextjs.org/learn",
    );
  });

  it("renders the Vercel logomark", () => {
    render(<Home />);
    const vercelLogo = screen.getByAltText("Vercel logomark");
    expect(vercelLogo).toBeDefined();
    expect(vercelLogo.getAttribute("src")).toBe("/vercel.svg");
  });
});
