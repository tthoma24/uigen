import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getFriendlyLabel, ToolInvocationBadge } from "../ToolInvocationBadge";
import type { ToolInvocation } from "@ai-sdk/ui-utils";

afterEach(() => cleanup());

// --- getFriendlyLabel ---

function call(toolName: string, args: Record<string, unknown>): ToolInvocation {
  return { state: "call", toolCallId: "id", toolName, args };
}

test("str_replace_editor create", () => {
  expect(getFriendlyLabel(call("str_replace_editor", { command: "create", path: "/App.jsx" }))).toBe("Creating /App.jsx");
});

test("str_replace_editor str_replace", () => {
  expect(getFriendlyLabel(call("str_replace_editor", { command: "str_replace", path: "/App.jsx" }))).toBe("Editing /App.jsx");
});

test("str_replace_editor insert", () => {
  expect(getFriendlyLabel(call("str_replace_editor", { command: "insert", path: "/App.jsx" }))).toBe("Editing /App.jsx");
});

test("str_replace_editor view", () => {
  expect(getFriendlyLabel(call("str_replace_editor", { command: "view", path: "/App.jsx" }))).toBe("Viewing /App.jsx");
});

test("str_replace_editor undo_edit", () => {
  expect(getFriendlyLabel(call("str_replace_editor", { command: "undo_edit", path: "/App.jsx" }))).toBe("Undoing edit to /App.jsx");
});

test("file_manager rename", () => {
  expect(getFriendlyLabel(call("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" }))).toBe("Renaming /old.jsx to /new.jsx");
});

test("file_manager delete", () => {
  expect(getFriendlyLabel(call("file_manager", { command: "delete", path: "/App.jsx" }))).toBe("Deleting /App.jsx");
});

test("unknown tool falls back to toolName", () => {
  expect(getFriendlyLabel(call("some_other_tool", {}))).toBe("some_other_tool");
});

test("str_replace_editor with no path falls back to toolName", () => {
  expect(getFriendlyLabel(call("str_replace_editor", { command: "create" }))).toBe("str_replace_editor");
});

// --- ToolInvocationBadge render ---

test("loading state shows label without green dot", () => {
  const inv: ToolInvocation = { state: "call", toolCallId: "id", toolName: "str_replace_editor", args: { command: "create", path: "/App.jsx" } };
  render(<ToolInvocationBadge toolInvocation={inv} />);
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  expect(screen.queryByTestId("green-dot")).toBeNull();
});

test("result state shows label with green dot", () => {
  const inv: ToolInvocation = { state: "result", toolCallId: "id", toolName: "str_replace_editor", args: { command: "create", path: "/App.jsx" }, result: "ok" };
  render(<ToolInvocationBadge toolInvocation={inv} />);
  expect(screen.getByText("Creating /App.jsx")).toBeDefined();
  expect(screen.getByTestId("green-dot")).toBeDefined();
});
