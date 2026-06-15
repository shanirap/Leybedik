import type { SongLineElement } from "../types/editorDocument";

export type ChordLineKey = "aboveTop" | "aboveBottom" | "below";

export function getChordLineFontSize(
  data: SongLineElement["data"],
  line: ChordLineKey
): number {
  return data.chordLineFontSizes?.[line] ?? data.chordFontSize;
}

export function setChordLineFontSizeOverride(
  data: SongLineElement["data"],
  line: ChordLineKey,
  value: number
): SongLineElement["data"] {
  const nextFontSizes = { ...data.chordLineFontSizes };

  if (value === data.chordFontSize) {
    delete nextFontSizes[line];
  } else {
    nextFontSizes[line] = value;
  }

  const hasOverrides = Object.keys(nextFontSizes).length > 0;

  return {
    ...data,
    chordLineFontSizes: hasOverrides ? nextFontSizes : undefined,
  };
}
