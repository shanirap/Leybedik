import type {
  EditorDocumentContent,
  LegacyEditorDocumentContent,
} from "../types/editorDocument";
import {
  createEmptyEditorContent,
  normalizeEditorDocumentContent,
} from "./normalizeEditorDocumentContent";

export function isEditorDocumentContent(value: unknown): value is EditorDocumentContent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EditorDocumentContent>;

  return (
    typeof candidate.version === "number" &&
    Array.isArray(candidate.blocks)
  );
}

/**
 * Legacy compatibility helper.
 * The active editor no longer serializes from DOM.
 * This still accepts old arguments so old tests/imports compile.
 */
export function extractDocumentJson(root?: HTMLElement | null): EditorDocumentContent {
  void root;
  return createEmptyEditorContent();
}
/**
 * Legacy compatibility helper.
 * The active editor no longer renders by manually creating DOM.
 * This still accepts old arguments so old tests/imports compile.
 */
export function renderDocumentFromJson(
  content?: EditorDocumentContent,
  root?: HTMLElement | null,
  doc?: Document
): void {
  void content;
  void root;
  void doc;
}

export function parseEditorDocumentContent(value: unknown): EditorDocumentContent {
  if (!value) {
    return createEmptyEditorContent();
  }

  if (typeof value === "string") {
    try {
      return normalizeEditorDocumentContent(
        JSON.parse(value) as LegacyEditorDocumentContent
      );
    } catch {
      return createEmptyEditorContent();
    }
  }

  return normalizeEditorDocumentContent(value as LegacyEditorDocumentContent);
}

export function stringifyEditorDocumentContent(
  content: EditorDocumentContent
): string {
  return JSON.stringify(normalizeEditorDocumentContent(content));
}

export { createEmptyEditorContent, normalizeEditorDocumentContent };