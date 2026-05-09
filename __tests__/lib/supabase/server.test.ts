import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetAll = vi.fn(() => []);
const mockSet = vi.fn();
const mockCookieStore = { getAll: mockGetAll, set: mockSet };

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

const mockCreateServerClient = vi.fn((_url, _key, options) => {
  return {
    auth: { getUser: vi.fn() },
    _options: options,
  };
});

vi.mock("@supabase/ssr", () => ({
  createServerClient: mockCreateServerClient,
}));

describe("Supabase server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a server client with the correct environment variables", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    await createClient();

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      }),
    );
  });

  it("returns a client with auth capabilities", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    const client = await createClient();

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.auth.getUser).toBeDefined();
  });

  it("delegates getAll to the cookie store", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    await createClient();

    const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;
    cookiesConfig.getAll();

    expect(mockGetAll).toHaveBeenCalled();
  });

  it("delegates setAll to the cookie store", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    await createClient();

    const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;
    cookiesConfig.setAll([
      { name: "session", value: "abc123", options: { path: "/" } },
    ]);

    expect(mockSet).toHaveBeenCalledWith("session", "abc123", { path: "/" });
  });

  it("handles setAll errors gracefully (Server Component context)", async () => {
    mockSet.mockImplementationOnce(() => {
      throw new Error("Cannot set cookies in Server Component");
    });

    const { createClient } = await import("@/lib/supabase/server");
    await createClient();

    const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;

    expect(() =>
      cookiesConfig.setAll([
        { name: "session", value: "abc123", options: {} },
      ]),
    ).not.toThrow();
  });
});
