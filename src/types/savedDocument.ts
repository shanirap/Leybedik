// import type { EditorDocumentContent } from "./editorDocument";

// export interface SavedDocument {
//   id: string | number;
//   title: string;
//   contentJson: EditorDocumentContent;
//   createdAt: string;
//   updatedAt: string;
//   /** ירושה מ-localStorage לפני מיגרציה ל-JSON — יוצג עם innerHTML עד שמירה מחדש */
//   contentHtml?: string;
// }


import type { EditorDocumentContent } from "./editorDocument";

export type DocumentFolder =
  | "general"
  | "organ"
  | "guitar"
  | "violin"
  | "drums";

export const DOCUMENT_FOLDER_LABELS: Record<DocumentFolder, string> = {
  general: "כללי",
  organ: "אורגן",
  guitar: "גיטרה",
  violin: "כינור",
  drums: "תופים",
};

export const DOCUMENT_FOLDERS: DocumentFolder[] = [
  "general",
  "organ",
  "guitar",
  "violin",
  "drums",
];

export function normalizeDocumentFolder(value: unknown): DocumentFolder {
  return DOCUMENT_FOLDERS.includes(value as DocumentFolder)
    ? (value as DocumentFolder)
    : "general";
}

export interface SavedDocument {
  id: string | number;
  title: string;
  folder: DocumentFolder;
  contentJson: EditorDocumentContent;
  createdAt: string;
  updatedAt: string;
  /** ירושה מ-localStorage לפני מיגרציה ל-JSON — יוצג עם innerHTML עד שמירה מחדש */
  contentHtml?: string;
}