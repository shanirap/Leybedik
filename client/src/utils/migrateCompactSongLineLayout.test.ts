import { describe, expect, it } from "vitest";
import type { PageJson } from "../types/editorDocument";
import {
  ATTACHED_LYRICS_ROW_Y,
  FIRST_TEMPLATE_Y,
  SONG_LINE_GAP,
  SONG_LINE_HEIGHT,
} from "../constants/songLineLayout";
import { migratePageToCompactSongLineLayout } from "./migrateCompactSongLineLayout";
import { normalizeEditorDocumentContent } from "./normalizeEditorDocumentContent";

function createLegacyPage(): PageJson {
  return {
    id: "page-1",
    width: 794,
    height: 1123,
    elements: [
      {
        id: "song-line-1",
        type: "songLine",
        x: 40,
        y: 120,
        width: 680,
        height: 92,
        zIndex: 1,
        data: {
          lyrics: "שורה א",
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
      },
      {
        id: "song-line-2",
        type: "songLine",
        x: 40,
        y: 222,
        width: 680,
        height: 92,
        zIndex: 2,
        data: {
          lyrics: "שורה ב",
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
            aboveTop: "Dm",
            aboveBottom: "F",
            below: "C",
          },
        },
      },
      {
        id: "circle-1",
        type: "symbol",
        x: 180,
        y: 250,
        width: 20,
        height: 24,
        zIndex: 3,
        data: {
          symbolType: "circleNumber",
          attachment: {
            songLineId: "song-line-1",
            row: "lyrics",
            offsetX: 80,
            offsetY: -8,
          },
        },
      },
    ],
  };
}

describe("migrateCompactSongLineLayout", () => {
  it("restacks legacy song lines and preserves attached symbol screen position", () => {
    const migrated = migratePageToCompactSongLineLayout(createLegacyPage());
    const firstLine = migrated.elements.find((element) => element.id === "song-line-1");
    const secondLine = migrated.elements.find((element) => element.id === "song-line-2");
    const circle = migrated.elements.find((element) => element.id === "circle-1");

    expect(firstLine?.type).toBe("songLine");
    expect(secondLine?.type).toBe("songLine");

    if (firstLine?.type === "songLine" && secondLine?.type === "songLine") {
      expect(firstLine.height).toBe(SONG_LINE_HEIGHT);
      expect(secondLine.height).toBe(SONG_LINE_HEIGHT);
      expect(firstLine.y).toBe(FIRST_TEMPLATE_Y);
      expect(secondLine.y).toBe(FIRST_TEMPLATE_Y + SONG_LINE_HEIGHT + SONG_LINE_GAP);
    }

    expect(circle?.type).toBe("symbol");
    if (circle?.type === "symbol") {
      expect(circle.x).toBe(0);
      expect(circle.y).toBe(0);
      expect(circle.data.attachment?.offsetY).toBe(-2);

      const absoluteY =
        (firstLine?.type === "songLine" ? firstLine.y : 0) +
        ATTACHED_LYRICS_ROW_Y +
        (circle.data.attachment?.offsetY ?? 0);

      expect(absoluteY).toBe(120 + 42 - 8);
    }
  });

  it("bumps document version after migrating legacy layout", () => {
    const normalized = normalizeEditorDocumentContent({
      version: 2,
      blocks: [],
      pages: [createLegacyPage()],
    });

    expect(normalized.version).toBe(3);
  });
});
