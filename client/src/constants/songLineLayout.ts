export const SONG_LINE_HEIGHT = 78;
export const SONG_LINE_GAP = 6;
export const SONG_LINE_CONTENT_PADDING_Y = 2;
export const SONG_LINE_CHORD_ROW_HEIGHT = 16;
export const SONG_LINE_LYRICS_ROW_HEIGHT = 24;
export const SONG_LINE_GRID_GAP = 1;
export const FIRST_TEMPLATE_Y = 120;
export const TAB_BLOCK_HEIGHT = 150;
export const TEMPLATE_LEFT = 40;
export const TEMPLATE_WIDTH = 680;

/** Pre-compact layout (92px rows) — used for one-time document migration. */
export const LEGACY_SONG_LINE_HEIGHT = 92;
export const LEGACY_ATTACHED_LYRICS_ROW_Y = 42;
export const LEGACY_ATTACHED_CHORDS_TOP_ROW_Y = 22;

export const ATTACHED_CHORDS_TOP_ROW_Y =
  SONG_LINE_CONTENT_PADDING_Y +
  SONG_LINE_CHORD_ROW_HEIGHT +
  SONG_LINE_GRID_GAP;

export const ATTACHED_LYRICS_ROW_Y =
  SONG_LINE_CONTENT_PADDING_Y +
  SONG_LINE_CHORD_ROW_HEIGHT +
  SONG_LINE_GRID_GAP +
  SONG_LINE_CHORD_ROW_HEIGHT +
  SONG_LINE_GRID_GAP;

export function getSongLineGridTemplateRows(): string {
  return `${SONG_LINE_CHORD_ROW_HEIGHT}px ${SONG_LINE_CHORD_ROW_HEIGHT}px ${SONG_LINE_LYRICS_ROW_HEIGHT}px ${SONG_LINE_CHORD_ROW_HEIGHT}px`;
}
