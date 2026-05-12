import type { SavedDocument } from "../types/savedDocument";
import {
  createEmptyEditorContent,
  isEditorDocumentContent,
} from "./editorDocumentSerializer";

const STORAGE_KEY = "leybedik-documents";

function normalizeSavedDocument(raw: Record<string, unknown>): SavedDocument {
  const idRaw = raw.id;
  const id: string | number =
    typeof idRaw === "number"
      ? idRaw
      : String(idRaw ?? "");
  const title = String(raw.title ?? "");
  const createdAt = String(raw.createdAt ?? new Date().toISOString());
  const updatedAt = String(raw.updatedAt ?? createdAt);

  let contentJson = createEmptyEditorContent();
  if (isEditorDocumentContent(raw.contentJson)) {
    contentJson = {
      version: raw.contentJson.version,
      blocks: raw.contentJson.blocks ?? [],
      elements: raw.contentJson.elements,
      pages: raw.contentJson.pages,
    };
  }

  const legacyHtml =
    typeof raw.contentHtml === "string" ? raw.contentHtml : undefined;

  const doc: SavedDocument = {
    id,
    title,
    contentJson,
    createdAt,
    updatedAt,
  };

  if (legacyHtml !== undefined) {
    doc.contentHtml = legacyHtml;
  }

  return doc;
}

export function getAllDocuments(): SavedDocument[] {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown[];
    const documents = parsed.map((item) =>
      normalizeSavedDocument(item as Record<string, unknown>)
    );

    return documents.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch {
    return [];
  }
}

export function getDocumentById(id: string): SavedDocument | undefined {
  return getAllDocuments().find((doc) => String(doc.id) === String(id));
}

export function saveDocument(document: SavedDocument): void {
  const documents = getAllDocuments();
  const existingIndex = documents.findIndex(
    (doc) => String(doc.id) === String(document.id)
  );

  const toStore: SavedDocument = { ...document };
  if (toStore.contentJson.blocks.length > 0) {
    delete toStore.contentHtml;
  }

  if (existingIndex >= 0) {
    documents[existingIndex] = toStore;
  } else {
    documents.unshift(toStore);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
}

export function deleteDocument(id: string): void {
  const documents = getAllDocuments().filter(
    (doc) => String(doc.id) !== String(id)
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
}

export function duplicateDocument(id: string): SavedDocument | null {
  const original = getDocumentById(id);

  if (!original) return null;

  const now = new Date().toISOString();

  const copy: SavedDocument = {
    id: `temp-${crypto.randomUUID()}`,
    title: `${original.title || "מסמך ללא שם"} - עותק`,
    contentJson: structuredClone(original.contentJson),
    createdAt: now,
    updatedAt: now,
  };

  if (original.contentHtml !== undefined) {
    copy.contentHtml = original.contentHtml;
  }

  saveDocument(copy);

  return copy;
}
