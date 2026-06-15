import type {
  EditorDocumentContent,
  EditorElement,
  LegacyEditorDocumentContent,
  PageJson,
} from "../types/editorDocument";
import {
  COMPACT_SONG_LINE_LAYOUT_VERSION,
  migratePageToCompactSongLineLayout,
  pageNeedsCompactLayoutMigration,
} from "./migrateCompactSongLineLayout";

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

  const inputVersion = typeof input.version === "number" ? input.version : 2;
  const legacyBlocks = Array.isArray(input.blocks) ? input.blocks : [];

  if (Array.isArray(input.pages) && input.pages.length > 0) {
    const pages = input.pages.map((page, index) => normalizePage(page, index));
    const migrated = applyCompactSongLineLayoutMigration(pages, inputVersion);

    return {
      version: migrated.version,
      pages: migrated.pages,
      blocks: legacyBlocks,
      elements: input.elements,
    };
  }

  const legacyElements = Array.isArray(input.elements) ? input.elements : [];
  const pages = [createDefaultPage(legacyElements)];
  const migrated = applyCompactSongLineLayoutMigration(pages, inputVersion);

  return {
    version: migrated.version,
    pages: migrated.pages,
    blocks: legacyBlocks,
    elements: input.elements,
  };
}

function applyCompactSongLineLayoutMigration(
  pages: PageJson[],
  inputVersion: number
): { version: number; pages: PageJson[] } {
  const migratedPages = pages.map((page) => migratePageToCompactSongLineLayout(page));
  const needsVersionBump =
    inputVersion < COMPACT_SONG_LINE_LAYOUT_VERSION &&
    pages.some((page) => pageNeedsCompactLayoutMigration(page));

  return {
    version: needsVersionBump
      ? COMPACT_SONG_LINE_LAYOUT_VERSION
      : inputVersion,
    pages: migratedPages,
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