import type { SavedDocument, DocumentFolder } from "../types/savedDocument";
import { normalizeDocumentFolder } from "../types/savedDocument";
import type { EditorDocumentContent } from "../types/editorDocument";
import {
  createEmptyEditorContent,
  isEditorDocumentContent,
} from "../utils/editorDocumentSerializer";
import { apiRequest, readApiError } from "./client";

interface DocumentDto {
  id: number;
  title: string;
  folder?: DocumentFolder | string | null;
  contentJson: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentListItemDto {
  id: number;
  title: string;
  folder?: DocumentFolder | string | null;
  createdAt: string;
  updatedAt: string;
}

export function parseContentJson(raw: string): EditorDocumentContent {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isEditorDocumentContent(parsed)) {
      return {
        version: parsed.version,
        blocks: parsed.blocks ?? [],
        elements: parsed.elements,
        pages: parsed.pages,
      };
    }
  } catch {
    /* ignore */
  }
  return createEmptyEditorContent();
}

function mapDtoToSaved(dto: DocumentDto): SavedDocument {
  return {
    id: dto.id,
    title: dto.title,
    contentJson: parseContentJson(dto.contentJson),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    folder: normalizeDocumentFolder(dto.folder),
  };
}

export async function getDocuments(): Promise<SavedDocument[]> {
  const res = await apiRequest("/documents");
  if (!res.ok) throw new Error(await readApiError(res));

  const items = (await res.json()) as DocumentListItemDto[];

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    contentJson: createEmptyEditorContent(),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    folder: normalizeDocumentFolder(item.folder),
  }));
}

export async function getDocument(id: string | number): Promise<SavedDocument> {
  const res = await apiRequest(`/documents/${id}`);
  if (res.status === 404) throw new Error("המסמך לא נמצא");
  if (!res.ok) throw new Error(await readApiError(res));

  const dto = (await res.json()) as DocumentDto;
  return mapDtoToSaved(dto);
}

export async function createDocument(
  document: SavedDocument
): Promise<SavedDocument> {
  const title = (document.title?.trim() || "מסמך ללא שם").slice(0, 255);

  const res = await apiRequest("/documents", {
    method: "POST",
    body: JSON.stringify({
      title,
      folder: document.folder ?? "general",
      contentJson: JSON.stringify(document.contentJson),
    }),
  });

  if (!res.ok) throw new Error(await readApiError(res));

  const dto = (await res.json()) as DocumentDto;
  return mapDtoToSaved(dto);
}

export async function updateDocument(
  document: SavedDocument
): Promise<SavedDocument> {
  const title = (document.title?.trim() || "מסמך ללא שם").slice(0, 255);

  const res = await apiRequest(`/documents/${document.id}`, {
    method: "PUT",
    body: JSON.stringify({
      title,
      folder: document.folder ?? "general",
      contentJson: JSON.stringify(document.contentJson),
    }),
  });

  if (res.status === 404) throw new Error("המסמך לא נמצא");
  if (!res.ok) throw new Error(await readApiError(res));

  const dto = (await res.json()) as DocumentDto;
  return mapDtoToSaved(dto);
}

export async function deleteDocument(id: string | number): Promise<void> {
  const res = await apiRequest(`/documents/${id}`, { method: "DELETE" });
  if (res.status === 404) throw new Error("המסמך לא נמצא");
  if (!res.ok) throw new Error(await readApiError(res));
}
