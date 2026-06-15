import { describe, expect, it } from "vitest";
import {
  ATTACHED_CHORDS_TOP_ROW_Y,
  ATTACHED_LYRICS_ROW_Y,
  SONG_LINE_CHORD_ROW_HEIGHT,
  SONG_LINE_CONTENT_PADDING_Y,
  SONG_LINE_GRID_GAP,
  SONG_LINE_HEIGHT,
  SONG_LINE_LYRICS_ROW_HEIGHT,
} from "../constants/songLineLayout";

describe("songLineLayout", () => {
  it("uses compact total height", () => {
    expect(SONG_LINE_HEIGHT).toBe(78);
    expect(SONG_LINE_LYRICS_ROW_HEIGHT).toBe(24);
    expect(SONG_LINE_CHORD_ROW_HEIGHT).toBe(16);
  });

  it("derives attachment offsets from grid layout", () => {
    expect(ATTACHED_CHORDS_TOP_ROW_Y).toBe(
      SONG_LINE_CONTENT_PADDING_Y +
        SONG_LINE_CHORD_ROW_HEIGHT +
        SONG_LINE_GRID_GAP
    );
    expect(ATTACHED_LYRICS_ROW_Y).toBe(
      SONG_LINE_CONTENT_PADDING_Y +
        SONG_LINE_CHORD_ROW_HEIGHT +
        SONG_LINE_GRID_GAP +
        SONG_LINE_CHORD_ROW_HEIGHT +
        SONG_LINE_GRID_GAP
    );
    expect(ATTACHED_LYRICS_ROW_Y).toBe(36);
    expect(ATTACHED_CHORDS_TOP_ROW_Y).toBe(19);
  });
});
