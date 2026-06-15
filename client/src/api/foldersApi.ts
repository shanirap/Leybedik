import type { DocumentFolder } from "../types/savedDocument";
import { apiRequest, readApiError } from "./client";

export async function getFolders(): Promise<DocumentFolder[]> {
  const res = await apiRequest("/folders");

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  return (await res.json()) as DocumentFolder[];
}

export async function createFolder(name: string): Promise<DocumentFolder> {
  const res = await apiRequest("/folders", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  return (await res.json()) as DocumentFolder;
}

export async function updateFolder(
  id: number,
  name: string
): Promise<DocumentFolder> {
  const res = await apiRequest(`/folders/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });

  if (res.status === 404) {
    throw new Error("התיקייה לא נמצאה");
  }

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }

  return (await res.json()) as DocumentFolder;
}

export async function deleteFolder(id: number): Promise<void> {
  const res = await apiRequest(`/folders/${id}`, {
    method: "DELETE",
  });

  if (res.status === 404) {
    throw new Error("התיקייה לא נמצאה");
  }

  if (res.status === 409) {
    throw new Error(await readApiError(res));
  }

  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
}