import type {
  AttachedSymbolRow,
  EditorElement,
  PageJson,
  SongLineElement,
  SymbolElement,
} from "../types/editorDocument";

import {
  ATTACHED_CHORDS_TOP_ROW_Y,
  ATTACHED_LYRICS_ROW_Y,
} from "../constants/songLineLayout";

export { ATTACHED_CHORDS_TOP_ROW_Y, ATTACHED_LYRICS_ROW_Y };

function isSongLineElement(element: EditorElement): element is SongLineElement {
  return element.type === "songLine";
}

export function isAttachedSymbolMovementLocked(symbol: SymbolElement): boolean {
  return Boolean(symbol.data.attachment);
}

export function isLyricsRowLockedSymbol(symbol: SymbolElement): boolean {
  return isAttachedSymbolMovementLocked(symbol);
}

export function getAttachedRowBaseY(
  songLineY: number,
  row: AttachedSymbolRow
): number {
  if (row === "lyrics") {
    return songLineY + ATTACHED_LYRICS_ROW_Y;
  }

  if (row === "chordsTop") {
    return songLineY + ATTACHED_CHORDS_TOP_ROW_Y;
  }

  return songLineY;
}

export function computeAttachedOffsetsFromPosition(
  page: PageJson,
  symbol: SymbolElement,
  x: number
): { offsetX: number; offsetY: number } | null {
  const attachment = symbol.data.attachment;

  if (!attachment) {
    return null;
  }

  const songLine = page.elements.find(
    (element): element is SongLineElement =>
      isSongLineElement(element) && element.id === attachment.songLineId
  );

  if (!songLine) {
    return null;
  }

  return {
    offsetX: x - songLine.x,
    offsetY: attachment.offsetY ?? 0,
  };
}

export function getAttachedSymbolPosition(
  page: PageJson,
  symbol: SymbolElement
): { x: number; y: number } {
  const attachment = symbol.data.attachment;

  if (!attachment) {
    return {
      x: symbol.x,
      y: symbol.y,
    };
  }

  const songLine = page.elements.find(
    (element): element is SongLineElement =>
      isSongLineElement(element) && element.id === attachment.songLineId
  );

  if (!songLine) {
    return {
      x: symbol.x,
      y: symbol.y,
    };
  }

  const baseX = songLine.x + attachment.offsetX;
  const baseY = getAttachedRowBaseY(songLine.y, attachment.row);

  return {
    x: baseX,
    y: baseY + (attachment.offsetY ?? 0),
  };
}

export function isAttachedSymbol(symbol: SymbolElement): boolean {
  return Boolean(symbol.data.attachment);
}