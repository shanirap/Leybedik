import { describe, expect, it } from "vitest";
import type { PageJson, SongLineElement, SymbolElement } from "../types/editorDocument";
import {
  ATTACHED_CHORDS_TOP_ROW_Y,
  ATTACHED_LYRICS_ROW_Y,
  computeAttachedOffsetsFromPosition,
  getAttachedRowBaseY,
  getAttachedSymbolPosition,
  isAttachedSymbol,
  isLyricsRowLockedSymbol,
} from "../components/attachedSymbolUtils";

function createSongLine(overrides: Partial<SongLineElement> = {}): SongLineElement {
  return {
    id: "song-line-1",
    type: "songLine",
    x: 100,
    y: 200,
    width: 500,
    height: 78,
    zIndex: 1,
    data: {
      lyrics: "מילים",
      lyricsFontSize: 19,
      lyricsFontFamily: "Arial",
      lyricsColor: "#111827",
      lyricsBold: false,
      lyricsAlign: "right",
      direction: "rtl",
      chords: [],
      chordFontSize: 14,
      chordColor: "#111827",
      chordLines: {
        aboveTop: "Am",
        aboveBottom: "C",
        below: "G",
      },
    },
    ...overrides,
  };
}

function createAttachedSymbol(
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
        offsetX: 40,
        offsetY: -8,
      },
    },
    ...overrides,
  };
}

function createPage(elements: PageJson["elements"]): PageJson {
  return {
    id: "page-1",
    width: 794,
    height: 1123,
    elements,
  };
}

describe("attachedSymbolUtils", () => {
  describe("isLyricsRowLockedSymbol", () => {
    it("locks every symbol that is attached to a song line", () => {
      expect(
        isLyricsRowLockedSymbol(
          createAttachedSymbol({
            data: {
              symbolType: "circleNumber",
              attachment: {
                songLineId: "song-line-1",
                row: "lyrics",
                offsetX: 10,
              },
            },
          })
        )
      ).toBe(true);

      expect(
        isLyricsRowLockedSymbol(
          createAttachedSymbol({
            data: {
              symbolType: "smallSharp",
              attachment: {
                songLineId: "song-line-1",
                row: "lyrics",
                offsetX: 10,
              },
            },
          })
        )
      ).toBe(true);

      expect(
        isLyricsRowLockedSymbol(
          createAttachedSymbol({
            data: {
              symbolType: "arrow",
              attachment: {
                songLineId: "song-line-1",
                row: "chordsTop",
                offsetX: 10,
              },
            },
          })
        )
      ).toBe(true);

      expect(
        isLyricsRowLockedSymbol(
          createAttachedSymbol({
            data: {
              symbolType: "repeatEnd",
              attachment: {
                songLineId: "song-line-1",
                row: "lyrics",
                offsetX: 10,
                offsetY: 0,
              },
            },
          })
        )
      ).toBe(true);
    });

    it("does not lock unattached symbols", () => {
      expect(
        isLyricsRowLockedSymbol(
          createAttachedSymbol({ data: { symbolType: "fraction" } })
        )
      ).toBe(false);
    });
  });

  describe("getAttachedRowBaseY", () => {
    it("uses lyrics and chordsTop offsets from song line top", () => {
      expect(getAttachedRowBaseY(200, "lyrics")).toBe(200 + ATTACHED_LYRICS_ROW_Y);
      expect(getAttachedRowBaseY(200, "chordsTop")).toBe(
        200 + ATTACHED_CHORDS_TOP_ROW_Y
      );
    });
  });

  describe("getAttachedSymbolPosition", () => {
    it("returns absolute position from song line and attachment offsets", () => {
      const page = createPage([createSongLine(), createAttachedSymbol()]);

      expect(getAttachedSymbolPosition(page, createAttachedSymbol())).toEqual({
        x: 140,
        y: 200 + ATTACHED_LYRICS_ROW_Y - 8,
      });
    });

    it("falls back to symbol x/y when not attached", () => {
      const symbol = createAttachedSymbol({
        x: 55,
        y: 77,
        data: { symbolType: "fraction" },
      });

      expect(
        getAttachedSymbolPosition(createPage([createSongLine()]), symbol)
      ).toEqual({ x: 55, y: 77 });
    });
  });

  describe("computeAttachedOffsetsFromPosition", () => {
    it("updates offsetX when dragging horizontally", () => {
      const page = createPage([createSongLine(), createAttachedSymbol()]);
      const symbol = createAttachedSymbol();
      const songLine = createSongLine();
      const current = getAttachedSymbolPosition(page, symbol);

      const offsets = computeAttachedOffsetsFromPosition(
        page,
        symbol,
        current.x + 12
      );

      expect(offsets).toEqual({
        offsetX: 52,
        offsetY: -8,
      });
      expect(songLine.x + (offsets?.offsetX ?? 0)).toBe(current.x + 12);
    });

    it("ignores vertical drag for every attached symbol", () => {
      const page = createPage([createSongLine(), createAttachedSymbol()]);
      const symbol = createAttachedSymbol();

      const offsets = computeAttachedOffsetsFromPosition(page, symbol, 180);

      expect(offsets).toEqual({
        offsetX: 80,
        offsetY: -8,
      });
    });

    it("ignores vertical drag for attached arrow on lyrics row", () => {
      const page = createPage([createSongLine()]);
      const symbol = createAttachedSymbol({
        data: {
          symbolType: "arrow",
          attachment: {
            songLineId: "song-line-1",
            row: "lyrics",
            offsetX: 30,
            offsetY: 4,
          },
        },
      });

      const offsets = computeAttachedOffsetsFromPosition(page, symbol, 150);

      expect(offsets).toEqual({
        offsetX: 50,
        offsetY: 4,
      });
    });

    it("ignores vertical drag for chordsTop attachments", () => {
      const page = createPage([createSongLine()]);
      const symbol = createAttachedSymbol({
        data: {
          symbolType: "repeatEnd",
          attachment: {
            songLineId: "song-line-1",
            row: "chordsTop",
            offsetX: 20,
            offsetY: 2,
          },
        },
      });

      const offsets = computeAttachedOffsetsFromPosition(page, symbol, 140);

      expect(offsets).toEqual({
        offsetX: 40,
        offsetY: 2,
      });
    });

    it("returns null when song line is missing", () => {
      const symbol = createAttachedSymbol({
        data: {
          symbolType: "circleNumber",
          attachment: {
            songLineId: "missing",
            row: "lyrics",
            offsetX: 0,
          },
        },
      });

      expect(
        computeAttachedOffsetsFromPosition(createPage([]), symbol, 10)
      ).toBeNull();
    });
  });

  describe("isAttachedSymbol", () => {
    it("detects attached symbols", () => {
      expect(isAttachedSymbol(createAttachedSymbol())).toBe(true);
      expect(
        isAttachedSymbol(
          createAttachedSymbol({ data: { symbolType: "fraction" } })
        )
      ).toBe(false);
    });
  });
});
