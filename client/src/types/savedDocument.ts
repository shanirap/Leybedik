import type { EditorDocumentContent } from "./editorDocument";

export interface DocumentFolder {
  id: number;
  name: string;
  documentsCount: number;
}

export interface SavedDocument {
  id: string | number;
  title: string;

  /**
   * Dynamic folder model from server.
   * null means the document is not inside any folder.
   */
  rules?: {
  'react-hooks/set-state-in-effect': 'off',
},folderId?: number | null;
  folderName?: string | null;

  contentJson: EditorDocumentContent;
  createdAt: string;
  updatedAt: string;

  /** ירושה מ-localStorage לפני מיגרציה ל-JSON — יוצג עם innerHTML עד שמירה מחדש */
  contentHtml?: string;
}