// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({ get: mockGet })),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(payload: object, expiresAt?: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt ?? Math.floor(Date.now() / 1000) + 600)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// Dynamic import keeps the mock in place before the module initializes
const { getSession } = await import("@/lib/auth");

test("returns null when no cookie is present", async () => {
  mockGet.mockReturnValue(undefined);
  expect(await getSession()).toBeNull();
});

test("returns the session payload for a valid token", async () => {
  const token = await makeToken({ userId: "u1", email: "a@b.com", expiresAt: new Date() });
  mockGet.mockReturnValue({ value: token });

  const session = await getSession();
  expect(session?.userId).toBe("u1");
  expect(session?.email).toBe("a@b.com");
});

test("returns null for an expired token", async () => {
  const token = await makeToken({ userId: "u1" }, Math.floor(Date.now() / 1000) - 60);
  mockGet.mockReturnValue({ value: token });

  expect(await getSession()).toBeNull();
});

test("returns null for a tampered token", async () => {
  mockGet.mockReturnValue({ value: "not.a.valid.jwt" });
  expect(await getSession()).toBeNull();
});

test("returns null for a token signed with the wrong secret", async () => {
  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const token = await new SignJWT({ userId: "u1" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(wrongSecret);
  mockGet.mockReturnValue({ value: token });

  expect(await getSession()).toBeNull();
});
