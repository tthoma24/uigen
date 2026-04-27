// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const { createSession } = await import("@/lib/auth");

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-key"
);

beforeEach(() => {
  vi.clearAllMocks();
});

test("createSession sets the auth-token cookie", async () => {
  await createSession("user-1", "test@example.com");
  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  expect(mockCookieStore.set.mock.calls[0][0]).toBe("auth-token");
});

test("createSession sets a string JWT as the cookie value", async () => {
  await createSession("user-1", "test@example.com");
  const token = mockCookieStore.set.mock.calls[0][1];
  expect(typeof token).toBe("string");
  expect(token.split(".")).toHaveLength(3);
});

test("createSession embeds userId and email in the JWT", async () => {
  await createSession("user-42", "hello@example.com");
  const token = mockCookieStore.set.mock.calls[0][1];
  const { payload } = await jwtVerify(token, JWT_SECRET);
  expect(payload.userId).toBe("user-42");
  expect(payload.email).toBe("hello@example.com");
});

test("createSession sets httpOnly, sameSite, and path cookie options", async () => {
  await createSession("user-1", "test@example.com");
  const options = mockCookieStore.set.mock.calls[0][2];
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession sets cookie expiry ~7 days from now", async () => {
  const before = Date.now();
  await createSession("user-1", "test@example.com");
  const after = Date.now();
  const expires: Date = mockCookieStore.set.mock.calls[0][2].expires;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
  expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
});
