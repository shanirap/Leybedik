import { describe, expect, it } from "vitest";
import {
  createEmptyEditorContent,
  extractDocumentJson,
  isEditorDocumentContent,
  renderDocumentFromJson,
} from "./editorDocumentSerializer";

describe("editorDocumentSerializer", () => {
  it("createEmptyEditorContent מחזיר גרסה 2 ו-blocks ריק", () => {
    const empty = createEmptyEditorContent();
    expect(empty.version).toBe(2);
    expect(empty.blocks).toEqual([]);
  });

  it("isEditorDocumentContent מזהה מבנה תקין ודוחה קלט לא תקין", () => {
    expect(isEditorDocumentContent({ version: 1, blocks: [] })).toBe(true);
    expect(isEditorDocumentContent({ version: 1, blocks: [{}] })).toBe(true);
    expect(isEditorDocumentContent(null)).toBe(false);
    expect(isEditorDocumentContent({})).toBe(false);
    expect(isEditorDocumentContent({ version: "1", blocks: [] })).toBe(false);
  });

  it("extractDocumentJson על שורש ריק לא זורק ומחזיר blocks ריק", () => {
    const root = document.createElement("div");
    const json = extractDocumentJson(root);
    expect(json.blocks).toEqual([]);
    expect(json.version).toBe(2);
  });
it("extractDocumentJson על DOM ישן לא שובר ומחזיר מבנה עמודים תקין", () => {
  const root = document.createElement("div");

  const json = extractDocumentJson(root);

  expect(json.version).toBe(2);
  expect(json.blocks).toEqual([]);
  expect(json.pages).toBeDefined();
  expect(json.pages.length).toBeGreaterThanOrEqual(1);
  expect(json.pages[0].elements).toEqual([]);
});
it("renderDocumentFromJson ואז extractDocumentJson לא שוברים ומחזירים version תקין", () => {
  const container = document.createElement("div");

  const content = {
    version: 2,
    blocks: [],
    pages: [
      {
        id: "page-1",
        width: 794,
        height: 1123,
        elements: [],
      },
    ],
  };

renderDocumentFromJson(content, container);
  const roundTrip = extractDocumentJson(container);

  expect(roundTrip.version).toBe(2);
  expect(roundTrip.blocks).toEqual([]);
  expect(roundTrip.pages).toBeDefined();
});

it("preserves song line chordLineFontSizes and lyricsStyleSpans in JSON roundtrip", () => {
  const content = createEmptyEditorContent();
  content.pages[0].elements = [
    {
      id: "song-line-1",
      type: "songLine",
      x: 40,
      y: 80,
      width: 500,
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
        chordLineFontSizes: {
          aboveTop: 16,
          below: 12,
        },
        lyricsStyleSpans: [
          {
            id: "span-0-3",
            start: 0,
            end: 3,
            bold: true,
          },
        ],
        chordLines: {
          aboveTop: "Am",
          aboveBottom: "",
          below: "G",
        },
      },
    },
  ];

  const serialized = JSON.stringify(content);
  const parsed = JSON.parse(serialized) as typeof content;
  const songLine = parsed.pages[0].elements[0];

  expect(songLine.type).toBe("songLine");
  if (songLine.type === "songLine") {
    expect(songLine.data.chordLineFontSizes).toEqual({
      aboveTop: 16,
      below: 12,
    });
    expect(songLine.data.lyricsStyleSpans).toEqual([
      {
        id: "span-0-3",
        start: 0,
        end: 3,
        bold: true,
      },
    ]);
  }
});
});
