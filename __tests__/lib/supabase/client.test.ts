import { describe, expect, it, vi, beforeEach } from "vitest";

const mockCreateBrowserClient = vi.fn(() => ({
  auth: { getUser: vi.fn() },
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: mockCreateBrowserClient,
}));

describe("Supabase browser client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a browser client with the correct environment variables", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    createClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-anon-key",
    );
  });

  it("returns the client instance from createBrowserClient", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const client = createClient();

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });

  it("creates a new client on each call", async () => {
    const { createClient } = await import("@/lib/supabase/client");
    createClient();
    createClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledTimes(2);
  });
});
