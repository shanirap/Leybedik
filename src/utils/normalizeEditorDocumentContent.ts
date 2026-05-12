import type {
  EditorDocumentContent,
  EditorElement,
  LegacyEditorDocumentContent,
  PageJson,
} from "../types/editorDocument";

export const A4_PAGE_WIDTH = 794;
export const A4_PAGE_HEIGHT = 1123;

export function createDefaultPage(elements: EditorElement[] = []): PageJson {
  return {
    id: "page-1",
    width: A4_PAGE_WIDTH,
    height: A4_PAGE_HEIGHT,
    elements,
  };
}

export function createEmptyEditorContent(): EditorDocumentContent {
  return {
    version: 2,
    pages: [createDefaultPage()],
    blocks: [],
  };
}

export function normalizeEditorDocumentContent(
  input: LegacyEditorDocumentContent | EditorDocumentContent | null | undefined
): EditorDocumentContent {
  if (!input || typeof input !== "object") {
    return createEmptyEditorContent();
  }

  const version = typeof input.version === "number" ? input.version : 2;
  const legacyBlocks = Array.isArray(input.blocks) ? input.blocks : [];

  if (Array.isArray(input.pages) && input.pages.length > 0) {
    return {
      version,
      pages: input.pages.map((page, index) => normalizePage(page, index)),
      blocks: legacyBlocks,
      elements: input.elements,
    };
  }

  const legacyElements = Array.isArray(input.elements) ? input.elements : [];

  return {
    version,
    pages: [createDefaultPage(legacyElements)],
    blocks: legacyBlocks,
    elements: input.elements,
  };
}

function normalizePage(page: Partial<PageJson>, index: number): PageJson {
  return {
    id: typeof page.id === "string" && page.id ? page.id : `page-${index + 1}`,
    width:
      typeof page.width === "number" && Number.isFinite(page.width)
        ? page.width
        : A4_PAGE_WIDTH,
    height:
      typeof page.height === "number" && Number.isFinite(page.height)
        ? page.height
        : A4_PAGE_HEIGHT,
    elements: Array.isArray(page.elements) ? page.elements : [],
  };
}