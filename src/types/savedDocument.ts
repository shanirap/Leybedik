import type { EditorDocumentContent } from "./editorDocument";

export interface SavedDocument {
  id: string | number;
  title: string;
  contentJson: EditorDocumentContent;
  createdAt: string;
  updatedAt: string;
  /** ירושה מ-localStorage לפני מיגרציה ל-JSON — יוצג עם innerHTML עד שמירה מחדש */
  contentHtml?: string;
}
