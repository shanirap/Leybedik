import {
  ATTACHED_CHORDS_TOP_ROW_Y,
  ATTACHED_LYRICS_ROW_Y,
  FIRST_TEMPLATE_Y,
  LEGACY_ATTACHED_CHORDS_TOP_ROW_Y,
  LEGACY_ATTACHED_LYRICS_ROW_Y,
  LEGACY_SONG_LINE_HEIGHT,
  SONG_LINE_GAP,
  SONG_LINE_HEIGHT,
  TAB_BLOCK_HEIGHT,
  TEMPLATE_LEFT,
  TEMPLATE_WIDTH,
} from "../constants/songLineLayout";
import type { EditorElement, PageJson } from "../types/editorDocument";

export const COMPACT_SONG_LINE_LAYOUT_VERSION = 3;

function isTemplateElement(element: EditorElement): boolean {
  return element.type === "songLine" || element.type === "tabBlock";
}

function getTemplateElementHeight(element: EditorElement): number {
  if (element.type === "songLine") {
    return SONG_LINE_HEIGHT;
  }

  if (element.type === "tabBlock") {
    return element.height > 0 ? element.height : TAB_BLOCK_HEIGHT;
  }

  return element.height;
}

function restackTemplateElements(elements: EditorElement[]): EditorElement[] {
  const templateElements = elements
    .filter(isTemplateElement)
    .sort((a, b) => a.y - b.y);

  if (templateElements.length === 0) {
    return elements;
  }

  let nextY = FIRST_TEMPLATE_Y;

  const repositioned = new Map(
    templateElements.map((element) => {
      const updated = {
        ...element,
        x: TEMPLATE_LEFT,
        y: nextY,
        width: TEMPLATE_WIDTH,
        height: getTemplateElementHeight(element),
      };

      nextY += getTemplateElementHeight(updated) + SONG_LINE_GAP;

      return [element.id, updated] as const;
    })
  );

  return elements.map((element) => repositioned.get(element.id) ?? element);
}

export function pageNeedsCompactLayoutMigration(page: PageJson): boolean {
  return page.elements.some(
    (element) =>
      element.type === "songLine" && element.height >= LEGACY_SONG_LINE_HEIGHT
  );
}

export function migratePageToCompactSongLineLayout(page: PageJson): PageJson {
  if (!pageNeedsCompactLayoutMigration(page)) {
    return {
      ...page,
      elements: page.elements.map((element) => {
        if (element.type !== "symbol" || !element.data.attachment) {
          return element;
        }

        if (element.x === 0 && element.y === 0) {
          return element;
        }

        return {
          ...element,
          x: 0,
          y: 0,
        };
      }),
    };
  }

  const lyricsOffsetAdjust =
    LEGACY_ATTACHED_LYRICS_ROW_Y - ATTACHED_LYRICS_ROW_Y;
  const chordsTopOffsetAdjust =
    LEGACY_ATTACHED_CHORDS_TOP_ROW_Y - ATTACHED_CHORDS_TOP_ROW_Y;

  const migratedElements = page.elements.map((element) => {
    if (element.type === "songLine") {
      return {
        ...element,
        height: SONG_LINE_HEIGHT,
      };
    }

    if (element.type !== "symbol" || !element.data.attachment) {
      return element;
    }

    const attachment = element.data.attachment;
    const offsetAdjust =
      attachment.row === "lyrics"
        ? lyricsOffsetAdjust
        : attachment.row === "chordsTop"
          ? chordsTopOffsetAdjust
          : 0;

    return {
      ...element,
      x: 0,
      y: 0,
      data: {
        ...element.data,
        attachment: {
          ...attachment,
          offsetY: (attachment.offsetY ?? 0) + offsetAdjust,
        },
      },
    };
  });

  return {
    ...page,
    elements: restackTemplateElements(migratedElements),
  };
}
