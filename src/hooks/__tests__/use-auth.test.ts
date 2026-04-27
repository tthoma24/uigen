import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    test("returns isLoading as false initially", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn and signUp functions", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
    });
  });

  describe("signIn", () => {
    test("sets isLoading to true during sign in and false after", async () => {
      let resolveSignIn!: (value: { success: boolean }) => void;
      (signInAction as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((resolve) => { resolveSignIn = resolve; })
      );
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-id" });

      const { result } = renderHook(() => useAuth());

      let signInPromise: Promise<{ success: boolean }>;
      act(() => {
        signInPromise = result.current.signIn("test@example.com", "password");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: true });
        await signInPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("calls signInAction with provided credentials", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "mypassword");
      });

      expect(signInAction).toHaveBeenCalledWith("user@example.com", "mypassword");
    });

    test("returns the result from signInAction", async () => {
      const authResult = { success: false, error: "Invalid credentials" };
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue(authResult);

      const { result } = renderHook(() => useAuth());

      let returnValue: { success: boolean; error?: string } | undefined;
      await act(async () => {
        returnValue = await result.current.signIn("user@example.com", "wrong");
      });

      expect(returnValue).toEqual(authResult);
    });

    test("does not redirect when sign in fails", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "wrong");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("sets isLoading to false even if signInAction throws", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("sets isLoading to true during sign up and false after", async () => {
      let resolveSignUp!: (value: { success: boolean }) => void;
      (signUpAction as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((resolve) => { resolveSignUp = resolve; })
      );
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-id" });

      const { result } = renderHook(() => useAuth());

      let signUpPromise: Promise<{ success: boolean }>;
      act(() => {
        signUpPromise = result.current.signUp("new@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: true });
        await signUpPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("calls signUpAction with provided credentials", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(signUpAction).toHaveBeenCalledWith("new@example.com", "password123");
    });

    test("returns the result from signUpAction", async () => {
      const authResult = { success: false, error: "Email already registered" };
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue(authResult);

      const { result } = renderHook(() => useAuth());

      let returnValue: { success: boolean; error?: string } | undefined;
      await act(async () => {
        returnValue = await result.current.signUp("existing@example.com", "password123");
      });

      expect(returnValue).toEqual(authResult);
    });

    test("sets isLoading to false even if signUpAction throws", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "password123").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("post sign-in routing", () => {
    test("creates project from anon work and redirects when anon messages exist", async () => {
      const anonWork = {
        messages: [{ id: "1", role: "user", content: "Hello" }],
        fileSystemData: { "/": { type: "directory" } },
      };
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(anonWork);
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "anon-project-id" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        })
      );
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/anon-project-id");
      expect(getProjects).not.toHaveBeenCalled();
    });

    test("does not create anon project when anon work has no messages", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({ messages: [], fileSystemData: {} });
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "existing-project" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(clearAnonWork).not.toHaveBeenCalled();
      expect(getProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });

    test("does not create anon project when getAnonWorkData returns null", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "existing-project" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(clearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-project");
    });

    test("redirects to the most recent project when no anon work exists", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "recent-project" },
        { id: "older-project" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/recent-project");
      expect(createProject).not.toHaveBeenCalled();
    });

    test("creates a new project when no existing projects and no anon work", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "brand-new-id" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "password");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/brand-new-id");
    });

    test("post sign-up flow mirrors post sign-in: uses anon work when present", async () => {
      const anonWork = {
        messages: [{ id: "1", role: "user", content: "Make a button" }],
        fileSystemData: { "/": { type: "directory" }, "/App.jsx": { type: "file", content: "" } },
      };
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(anonWork);
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-user-project" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("brand@new.com", "password123");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        })
      );
      expect(clearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/new-user-project");
    });

    test("post sign-up flow creates new project when no anon work and no projects", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "fresh-project" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("brand@new.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/fresh-project");
    });
  });
});
