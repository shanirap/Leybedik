import { describe, expect, it } from "vitest";
import type { PageJson, SongLineElement, SymbolElement } from "../types/editorDocument";
import {
  ATTACHED_CHORDS_TOP_ROW_Y,
  ATTACHED_LYRICS_ROW_Y,
  FIRST_TEMPLATE_Y,
  LEGACY_ATTACHED_CHORDS_TOP_ROW_Y,
  LEGACY_ATTACHED_LYRICS_ROW_Y,
  LEGACY_SONG_LINE_HEIGHT,
  SONG_LINE_CHORD_ROW_HEIGHT,
  SONG_LINE_CONTENT_PADDING_Y,
  SONG_LINE_GAP,
  SONG_LINE_GRID_GAP,
  SONG_LINE_HEIGHT,
  SONG_LINE_LYRICS_ROW_HEIGHT,
  TEMPLATE_LEFT,
  TEMPLATE_WIDTH,
  getSongLineGridTemplateRows,
} from "../constants/songLineLayout";
import {
  computeAttachedOffsetsFromPosition,
  getAttachedRowBaseY,
  getAttachedSymbolPosition,
  isAttachedSymbol,
  isLyricsRowLockedSymbol,
} from "../components/attachedSymbolUtils";
import {
  migratePageToCompactSongLineLayout,
  pageNeedsCompactLayoutMigration,
} from "./migrateCompactSongLineLayout";
import { normalizeEditorDocumentContent } from "./normalizeEditorDocumentContent";
import {
  applyAttachedSymbolKeyboardOffset,
  clamp,
  clampFreeElementPosition,
  getArrowKeyDelta,
  isKeyboardMovableFreeElement,
} from "./editorMovementUtils";
import {
  getChordLineFontSize,
  setChordLineFontSizeOverride,
} from "./songLineChordUtils";
import {
  getLyricsCaretCenterRelativeTo,
  getSelectionOffsets,
  getTextOffsetInElement,
  setSelectionOffsets,
} from "./lyricsEditorUtils";

function createSongLine(
  overrides: Partial<SongLineElement> = {}
): SongLineElement {
  return {
    id: "song-line-1",
    type: "songLine",
    x: 40,
    y: 120,
    width: 680,
    height: 78,
    zIndex: 1,
    data: {
      lyrics: "שלום",
      lyricsFontSize: 19,
      lyricsFontFamily: "Arial",
      lyricsColor: "#111827",
      lyricsBold: false,
      lyricsAlign: "right",
      direction: "rtl",
      chords: [],
      chordFontSize: 14,
      chordColor: "#111827",
      chordLines: { aboveTop: "", aboveBottom: "", below: "" },
    },
    ...overrides,
  };
}

function createSymbol(
  overrides: Partial<SymbolElement> = {}
): SymbolElement {
  return {
    id: "symbol-1",
    type: "symbol",
    x: 0,
    y: 0,
    width: 20,
    height: 24,
    zIndex: 2,
    data: {
      symbolType: "circleNumber",
      attachment: {
        songLineId: "song-line-1",
        row: "lyrics",
        offsetX: 30,
        offsetY: -5,
      },
    },
    ...overrides,
  };
}

function createPage(elements: PageJson["elements"]): PageJson {
  return { id: "page-1", width: 794, height: 1123, elements };
}

describe("edge cases", () => {
  describe("attachedSymbolUtils", () => {
    it("handles negative offsetX on lyrics row", () => {
      const page = createPage([
        createSongLine(),
        createSymbol({
          data: {
            symbolType: "smallSharp",
            attachment: {
              songLineId: "song-line-1",
              row: "lyrics",
              offsetX: -4,
              offsetY: 2,
            },
          },
        }),
      ]);

      expect(getAttachedSymbolPosition(page, createSymbol({
        data: {
          symbolType: "smallSharp",
          attachment: {
            songLineId: "song-line-1",
            row: "lyrics",
            offsetX: -4,
            offsetY: 2,
          },
        },
      }))).toEqual({
        x: 36,
        y: 120 + ATTACHED_LYRICS_ROW_Y + 2,
      });
    });

    it("treats missing offsetY as zero", () => {
      const page = createPage([createSongLine()]);
      const symbol = createSymbol({
        data: {
          symbolType: "volta",
          attachment: {
            songLineId: "song-line-1",
            row: "chordsTop",
            offsetX: 20,
          },
        },
      });

      expect(getAttachedSymbolPosition(page, symbol).y).toBe(
        120 + ATTACHED_CHORDS_TOP_ROW_Y
      );
    });

    it("positions symbol when song line y is zero", () => {
      const page = createPage([createSongLine({ y: 0 })]);
      const symbol = createSymbol();

      expect(getAttachedSymbolPosition(page, symbol).y).toBe(
        ATTACHED_LYRICS_ROW_Y - 5
      );
    });

    it("keeps independent positions for multiple attached symbols", () => {
      const page = createPage([
        createSongLine(),
        createSymbol({ id: "a", data: { symbolType: "circleNumber", attachment: { songLineId: "song-line-1", row: "lyrics", offsetX: 10, offsetY: 0 } } }),
        createSymbol({ id: "b", data: { symbolType: "arrow", attachment: { songLineId: "song-line-1", row: "chordsTop", offsetX: 50, offsetY: 8 } } }),
      ]);

      const circle = page.elements[1] as SymbolElement;
      const arrow = page.elements[2] as SymbolElement;

      expect(getAttachedSymbolPosition(page, circle).x).toBe(50);
      expect(getAttachedSymbolPosition(page, arrow).y).toBe(
        120 + ATTACHED_CHORDS_TOP_ROW_Y + 8
      );
    });

    it("allows horizontal drag left of song line origin", () => {
      const page = createPage([createSongLine({ x: 100 })]);
      const symbol = createSymbol();

      const offsets = computeAttachedOffsetsFromPosition(page, symbol, 90);

      expect(offsets).toEqual({ offsetX: -10, offsetY: -5 });
    });

    it("falls back to stored x/y when attached song line id is missing", () => {
      const symbol = createSymbol({
        x: 210,
        y: 340,
        data: {
          symbolType: "repeatEnd",
          attachment: { songLineId: "gone", row: "lyrics", offsetX: 0 },
        },
      });

      expect(getAttachedSymbolPosition(createPage([]), symbol)).toEqual({
        x: 210,
        y: 340,
      });
    });

    it("locks volta attached to chordsTop row", () => {
      const symbol = createSymbol({
        data: {
          symbolType: "volta",
          attachment: {
            songLineId: "song-line-1",
            row: "chordsTop",
            offsetX: 12,
            offsetY: 8,
          },
        },
      });

      expect(isLyricsRowLockedSymbol(symbol)).toBe(true);
    });

    it("getAttachedRowBaseY at y=0 matches layout constants", () => {
      expect(getAttachedRowBaseY(0, "lyrics")).toBe(ATTACHED_LYRICS_ROW_Y);
      expect(getAttachedRowBaseY(0, "chordsTop")).toBe(ATTACHED_CHORDS_TOP_ROW_Y);
    });
  });

  describe("migrateCompactSongLineLayout", () => {
    it("does not restack when song lines are already compact", () => {
      const page = createPage([
        createSongLine({ y: 250, height: 78 }),
        createSymbol({ x: 12, y: 34 }),
      ]);

      const migrated = migratePageToCompactSongLineLayout(page);
      const line = migrated.elements[0] as SongLineElement;

      expect(line.y).toBe(250);
      expect((migrated.elements[1] as SymbolElement).x).toBe(0);
    });

    it("restacks song line and tab block together", () => {
      const page = createPage([
        createSongLine({ id: "sl", y: 300, height: 92 }),
        {
          id: "tab",
          type: "tabBlock",
          x: 10,
          y: 500,
          width: 400,
          height: 150,
          zIndex: 1,
          data: {
            strings: 6,
            lineSpacing: 24,
            notes: [],
            fontSize: 24,
            lines: ["", "", "", "", "", ""],
            tabNumber: "",
            instrument: "guitar",
            repeatMarks: [],
            showMeasureLines: false,
          },
        },
      ]);

      const migrated = migratePageToCompactSongLineLayout(page);

      expect((migrated.elements[0] as SongLineElement).y).toBe(FIRST_TEMPLATE_Y);
      expect((migrated.elements[1] as { y: number }).y).toBe(
        FIRST_TEMPLATE_Y + SONG_LINE_HEIGHT + SONG_LINE_GAP
      );
    });

    it("pageNeedsCompactLayoutMigration is false for height 78", () => {
      expect(
        pageNeedsCompactLayoutMigration(createPage([createSongLine({ height: 78 })]))
      ).toBe(false);
    });

    it("pageNeedsCompactLayoutMigration is true for legacy height 92", () => {
      expect(
        pageNeedsCompactLayoutMigration(createPage([createSongLine({ height: 92 })]))
      ).toBe(true);
    });

    it("adjusts chordsTop offsetY by legacy delta on migration", () => {
      const page = createPage([
        createSongLine({ height: 92 }),
        createSymbol({
          data: {
            symbolType: "volta",
            attachment: {
              songLineId: "song-line-1",
              row: "chordsTop",
              offsetX: 20,
              offsetY: 8,
            },
          },
        }),
      ]);

      const migrated = migratePageToCompactSongLineLayout(page);
      const symbol = migrated.elements[1] as SymbolElement;

      expect(symbol.data.attachment?.offsetY).toBe(
        8 + (LEGACY_ATTACHED_CHORDS_TOP_ROW_Y - ATTACHED_CHORDS_TOP_ROW_Y)
      );
    });

    it("leaves free text box position unchanged during legacy migration", () => {
      const page = createPage([
        createSongLine({ height: 92 }),
        {
          id: "tb",
          type: "textBox",
          x: 77,
          y: 88,
          width: 100,
          height: 40,
          zIndex: 3,
          data: {
            text: "free",
            fontSize: 16,
            fontFamily: "Arial",
            color: "#000",
            bold: false,
            italic: false,
            underline: false,
            textAlign: "right",
            direction: "rtl",
          },
        },
      ]);

      const migrated = migratePageToCompactSongLineLayout(page);
      const textBox = migrated.elements.find((e) => e.id === "tb");

      expect(textBox?.x).toBe(77);
      expect(textBox?.y).toBe(88);
    });

    it("handles empty page without throwing", () => {
      const migrated = migratePageToCompactSongLineLayout(createPage([]));

      expect(migrated.elements).toEqual([]);
    });

    it("does not modify unattached symbols on legacy pages except clearing x/y", () => {
      const page = createPage([
        createSongLine({ height: 92 }),
        {
          id: "free-symbol",
          type: "symbol",
          x: 300,
          y: 400,
          width: 30,
          height: 18,
          zIndex: 2,
          data: { symbolType: "arrow" },
        },
      ]);

      const migrated = migratePageToCompactSongLineLayout(page);
      const symbol = migrated.elements.find((e) => e.id === "free-symbol") as SymbolElement;

      expect(symbol.data.symbolType).toBe("arrow");
      expect(isAttachedSymbol(symbol)).toBe(false);
    });
  });

  describe("songLineLayout constants", () => {
    it("getSongLineGridTemplateRows matches row heights", () => {
      expect(getSongLineGridTemplateRows()).toBe("16px 16px 24px 16px");
    });

    it("content rows sum to layout content area (79px including padding)", () => {
      const contentHeight =
        SONG_LINE_CONTENT_PADDING_Y * 2 +
        SONG_LINE_CHORD_ROW_HEIGHT * 3 +
        SONG_LINE_LYRICS_ROW_HEIGHT +
        SONG_LINE_GRID_GAP * 3;

      expect(contentHeight).toBe(79);
      expect(SONG_LINE_HEIGHT).toBe(78);
    });

    it("legacy lyrics offset is 6px below compact lyrics row start", () => {
      expect(LEGACY_ATTACHED_LYRICS_ROW_Y - ATTACHED_LYRICS_ROW_Y).toBe(6);
      expect(LEGACY_SONG_LINE_HEIGHT - SONG_LINE_HEIGHT).toBe(14);
    });
  });

  describe("lyricsEditorUtils edge cases", () => {
    it("getSelectionOffsets returns zero when selection is outside editor", () => {
      const editor = document.createElement("div");
      editor.contentEditable = "true";
      editor.textContent = "שלום";
      document.body.appendChild(editor);

      const outside = document.createElement("div");
      document.body.appendChild(outside);
      const range = document.createRange();
      range.selectNodeContents(outside);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);

      expect(getSelectionOffsets(editor)).toEqual({ start: 0, end: 0 });
    });

    it("getLyricsCaretCenterRelativeTo works at last character index", () => {
      const ancestor = document.createElement("div");
      ancestor.className = "song-line-element";
      ancestor.style.cssText =
        "position:absolute;left:0;top:0;width:400px;height:78px;";

      const editor = document.createElement("div");
      editor.contentEditable = "true";
      editor.style.fontSize = "19px";
      editor.textContent = "אבג";
      ancestor.appendChild(editor);
      document.body.appendChild(ancestor);

      const mockRect = {
        left: 50,
        top: 40,
        width: 10,
        height: 18,
      } as DOMRect;

      const rangeProto = Range.prototype as Range & {
        getClientRects: () => DOMRectList;
      };
      const originalGetClientRects = rangeProto.getClientRects;

      rangeProto.getClientRects = function getClientRects() {
        return {
          length: 1,
          0: mockRect,
          item: () => mockRect,
        } as unknown as DOMRectList;
      };

      ancestor.getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          width: 400,
          height: 78,
        }) as DOMRect;

      const center = getLyricsCaretCenterRelativeTo(editor, 2, ancestor);

      rangeProto.getClientRects = originalGetClientRects;

      expect(center).toEqual({ x: 55, y: 49 });
    });

    it("setSelectionOffsets no-ops safely on empty editor", () => {
      const editor = document.createElement("div");
      editor.contentEditable = "true";
      document.body.appendChild(editor);

      expect(() => setSelectionOffsets(editor, { start: 0, end: 0 })).not.toThrow();
    });

    it("getTextOffsetInElement adds raw offset when target node matches", () => {
      const editor = document.createElement("div");
      editor.textContent = "abc";
      document.body.appendChild(editor);
      const textNode = editor.firstChild as Text;

      expect(getTextOffsetInElement(editor, textNode, 2)).toBe(2);
      expect(getTextOffsetInElement(editor, textNode, 99)).toBe(99);
    });
  });

  describe("editorMovementUtils edge cases", () => {
    it("applyAttachedSymbolKeyboardOffset returns symbol unchanged without attachment", () => {
      const symbol: SymbolElement = {
        id: "s",
        type: "symbol",
        x: 10,
        y: 20,
        width: 20,
        height: 20,
        zIndex: 1,
        data: { symbolType: "fraction" },
      };

      expect(applyAttachedSymbolKeyboardOffset(symbol, 5)).toBe(symbol);
    });

    it("clamp returns boundary value when input equals bound", () => {
      expect(clamp(0, 0, 100)).toBe(0);
      expect(clamp(100, 0, 100)).toBe(100);
    });

    it("clampFreeElementPosition allows element flush against right/bottom edge", () => {
      expect(clampFreeElementPosition(694, 1073, 100, 50, 794, 1123)).toEqual({
        x: 694,
        y: 1073,
      });
    });

    it("applyAttachedSymbolKeyboardOffset supports large negative horizontal delta", () => {
      const symbol = createSymbol({
        data: {
          symbolType: "circleNumber",
          attachment: {
            songLineId: "song-line-1",
            row: "lyrics",
            offsetX: 5,
            offsetY: 0,
          },
        },
      });

      const moved = applyAttachedSymbolKeyboardOffset(symbol, -20);

      expect(moved.data.attachment?.offsetX).toBe(-15);
      expect(moved.data.attachment?.offsetY).toBe(0);
    });
  });

  describe("songLineChordUtils edge cases", () => {
    const baseData = {
      lyrics: "",
      lyricsFontSize: 19,
      lyricsFontFamily: "Arial",
      lyricsColor: "#111",
      lyricsBold: false,
      lyricsAlign: "right" as const,
      direction: "rtl" as const,
      chords: [],
      chordFontSize: 14,
      chordColor: "#111",
    };

    it("handles empty chordLineFontSizes object as all defaults", () => {
      const data = { ...baseData, chordLineFontSizes: {} };

      expect(getChordLineFontSize(data, "aboveTop")).toBe(14);
      expect(getChordLineFontSize(data, "below")).toBe(14);
    });

    it("keeps other row overrides when changing one row", () => {
      const data = {
        ...baseData,
        chordLineFontSizes: { aboveTop: 20, below: 11 },
      };

      const next = setChordLineFontSizeOverride(data, "aboveBottom", 16);

      expect(next.chordLineFontSizes).toEqual({
        aboveTop: 20,
        below: 11,
        aboveBottom: 16,
      });
    });

    it("stores explicit override even when value is smaller than default", () => {
      const next = setChordLineFontSizeOverride(baseData, "aboveTop", 8);

      expect(next.chordLineFontSizes).toEqual({ aboveTop: 8 });
      expect(getChordLineFontSize(next, "aboveTop")).toBe(8);
    });
  });

  describe("normalizeEditorDocumentContent edge cases", () => {
    it("normalizes null input to empty document", () => {
      const normalized = normalizeEditorDocumentContent(null);

      expect(normalized.pages).toHaveLength(1);
      expect(normalized.pages[0].elements).toEqual([]);
    });

    it("migrates legacy elements array into first page", () => {
      const normalized = normalizeEditorDocumentContent({
        version: 2,
        blocks: [],
        elements: [createSongLine({ height: 92 })],
      });

      expect(normalized.pages[0].elements[0].type).toBe("songLine");
      expect((normalized.pages[0].elements[0] as SongLineElement).height).toBe(
        SONG_LINE_HEIGHT
      );
    });

    it("assigns template geometry when restacking migrated legacy page", () => {
      const normalized = normalizeEditorDocumentContent({
        version: 2,
        blocks: [],
        pages: [
          createPage([createSongLine({ height: 92, x: 5, y: 400, width: 200 })]),
        ],
      });

      const line = normalized.pages[0].elements[0] as SongLineElement;

      expect(line.x).toBe(TEMPLATE_LEFT);
      expect(line.width).toBe(TEMPLATE_WIDTH);
      expect(line.y).toBe(FIRST_TEMPLATE_Y);
    });
  });

  describe("legacy lyricsBold compatibility", () => {
    it("normalization preserves lyricsBold on song lines", () => {
      const songLine = createSongLine();
      const page = createPage([
        {
          ...songLine,
          data: {
            ...songLine.data,
            lyrics: "מודגש",
            lyricsBold: true,
          },
        },
      ]);

      const normalized = normalizeEditorDocumentContent({
        version: 1,
        blocks: [],
        pages: [page],
      });

      const line = normalized.pages[0].elements[0] as SongLineElement;
      expect(line.data.lyricsBold).toBe(true);
    });
  });

  describe("keyboard navigation edge cases", () => {
    it("getArrowKeyDelta with step 0 returns zero deltas", () => {
      const delta = getArrowKeyDelta("ArrowLeft", 0);

      expect(delta).not.toBeNull();
      expect(Math.abs(delta!.deltaX)).toBe(0);
      expect(Math.abs(delta!.deltaY)).toBe(0);
    });

    it("isKeyboardMovableFreeElement returns false for undefined element", () => {
      expect(isKeyboardMovableFreeElement(undefined)).toBe(false);
    });

    it("fraction symbol without attachment is keyboard movable", () => {
      const symbol: SymbolElement = {
        id: "frac",
        type: "symbol",
        x: 0,
        y: 0,
        width: 20,
        height: 30,
        zIndex: 1,
        data: { symbolType: "fraction" },
      };

      expect(isKeyboardMovableFreeElement(symbol)).toBe(true);
    });
  });
});
