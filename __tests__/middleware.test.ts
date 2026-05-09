import { describe, expect, it, vi, beforeEach } from "vitest";
import { config } from "@/middleware";

const mockGetUser = vi.fn().mockResolvedValue({ data: { user: null } });

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("next/server", () => {
  class MockCookies {
    private cookies = new Map<string, { name: string; value: string }>();
    getAll() {
      return Array.from(this.cookies.values());
    }
    set(name: string, value: string, _options?: Record<string, unknown>) {
      this.cookies.set(name, { name, value });
    }
    get(name: string) {
      return this.cookies.get(name);
    }
  }

  class MockNextRequest {
    url: string;
    cookies: MockCookies;
    headers: Map<string, string>;
    nextUrl: { pathname: string };

    constructor(url: string) {
      this.url = url;
      this.cookies = new MockCookies();
      this.headers = new Map();
      this.nextUrl = { pathname: new URL(url).pathname };
    }
  }

  const MockNextResponse = {
    next: vi.fn(({ request }: { request: MockNextRequest }) => ({
      cookies: new MockCookies(),
      headers: new Map(),
      request,
    })),
  };

  return { NextResponse: MockNextResponse, NextRequest: MockNextRequest };
});

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports a route matcher config", () => {
    expect(config).toBeDefined();
    expect(config.matcher).toBeDefined();
    expect(config.matcher).toHaveLength(1);
  });

  it("matcher pattern is a valid regex string", () => {
    expect(() => new RegExp(config.matcher[0])).not.toThrow();
  });

  it("matcher uses a negative lookahead to exclude static assets", () => {
    const pattern = config.matcher[0];
    expect(pattern).toContain("_next/static");
    expect(pattern).toContain("_next/image");
    expect(pattern).toContain("favicon.ico");
    expect(pattern).toContain("svg");
    expect(pattern).toContain("png");
    expect(pattern).toContain("jpg");
    expect(pattern).toContain("jpeg");
    expect(pattern).toContain("gif");
    expect(pattern).toContain("webp");
  });

  it("calls supabase.auth.getUser to refresh the session", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    const { middleware } = await import("@/middleware");
    const { NextRequest } = await import("next/server");

    const request = new (NextRequest as unknown as new (url: string) => {
      url: string;
      cookies: { getAll: () => { name: string; value: string }[] };
    })("http://localhost:3000/dashboard");

    await middleware(request as never);

    expect(createServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      }),
    );
    expect(mockGetUser).toHaveBeenCalled();
  });

  it("returns a response object", async () => {
    const { middleware } = await import("@/middleware");
    const { NextRequest } = await import("next/server");

    const request = new (NextRequest as unknown as new (url: string) => {
      url: string;
      cookies: { getAll: () => { name: string; value: string }[] };
    })("http://localhost:3000/");

    const response = await middleware(request as never);
    expect(response).toBeDefined();
    expect(response.cookies).toBeDefined();
  });
});
