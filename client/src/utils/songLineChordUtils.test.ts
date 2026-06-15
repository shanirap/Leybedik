import { describe, expect, it } from "vitest";
import {
  getChordLineFontSize,
  setChordLineFontSizeOverride,
} from "./songLineChordUtils";
import type { SongLineElement } from "../types/editorDocument";

function createSongLineData(
  overrides: Partial<SongLineElement["data"]> = {}
): SongLineElement["data"] {
  return {
    lyrics: "",
    lyricsFontSize: 19,
    lyricsFontFamily: "Arial",
    lyricsColor: "#111827",
    lyricsBold: false,
    lyricsAlign: "right",
    direction: "rtl",
    chords: [],
    chordFontSize: 14,
    chordColor: "#111827",
    ...overrides,
  };
}

describe("songLineChordUtils", () => {
  it("falls back to chordFontSize when no override exists", () => {
    const data = createSongLineData({ chordFontSize: 16 });

    expect(getChordLineFontSize(data, "aboveTop")).toBe(16);
    expect(getChordLineFontSize(data, "below")).toBe(16);
  });

  it("uses per-row override when set", () => {
    const data = createSongLineData({
      chordFontSize: 14,
      chordLineFontSizes: { aboveTop: 18, below: 12 },
    });

    expect(getChordLineFontSize(data, "aboveTop")).toBe(18);
    expect(getChordLineFontSize(data, "aboveBottom")).toBe(14);
    expect(getChordLineFontSize(data, "below")).toBe(12);
  });

  it("removes override when value matches default", () => {
    const data = createSongLineData({
      chordFontSize: 14,
      chordLineFontSizes: { aboveTop: 18 },
    });

    const next = setChordLineFontSizeOverride(data, "aboveTop", 14);

    expect(next.chordLineFontSizes).toBeUndefined();
    expect(getChordLineFontSize(next, "aboveTop")).toBe(14);
  });

  it("stores override when value differs from default", () => {
    const data = createSongLineData({ chordFontSize: 14 });

    const next = setChordLineFontSizeOverride(data, "below", 20);

    expect(next.chordLineFontSizes).toEqual({ below: 20 });
  });

  it("supports independent sizes for all organ chord rows", () => {
    const data = createSongLineData({
      chordFontSize: 14,
      chordLineFontSizes: {
        aboveTop: 16,
        aboveBottom: 12,
        below: 18,
      },
    });

    expect(getChordLineFontSize(data, "aboveTop")).toBe(16);
    expect(getChordLineFontSize(data, "aboveBottom")).toBe(12);
    expect(getChordLineFontSize(data, "below")).toBe(18);
  });

  it("changing default does not remove existing per-row overrides", () => {
    const data = createSongLineData({
      chordFontSize: 14,
      chordLineFontSizes: { aboveTop: 20 },
    });

    const next = {
      ...data,
      chordFontSize: 18,
    };

    expect(getChordLineFontSize(next, "aboveTop")).toBe(20);
    expect(getChordLineFontSize(next, "below")).toBe(18);
  });
});
