import { describe, expect, it } from "vitest";
import {
  applyStyleToLyricsSelection,
  buildLyricsRuns,
  reconcileSpansOnTextChange,
} from "./lyricsStyleSpans";

describe("lyricsStyleSpans", () => {
  it("buildLyricsRuns applies bold and dashed underline to ranges", () => {
    const runs = buildLyricsRuns("שלום עולם", [
      {
        id: "s1",
        start: 0,
        end: 5,
        bold: true,
        underline: "dashed",
      },
    ]);

    expect(runs).toEqual([
      { text: "שלום ", bold: true, underline: "dashed" },
      { text: "עולם", bold: false, underline: "none" },
    ]);
  });

  it("applyStyleToLyricsSelection updates only selected range", () => {
    const spans = applyStyleToLyricsSelection([], 11, 6, 11, {
      underline: "dashed",
    });

    expect(spans).toEqual([
      {
        id: "span-6-11",
        start: 6,
        end: 11,
        underline: "dashed",
      },
    ]);
  });

  it("reconcileSpansOnTextChange shifts spans after insertion", () => {
    const spans = reconcileSpansOnTextChange("שלום", "שלוםם", [
      { id: "s1", start: 0, end: 4, bold: true },
    ]);

    expect(spans).toEqual([{ id: "s1", start: 0, end: 5, bold: true }]);
  });
});
