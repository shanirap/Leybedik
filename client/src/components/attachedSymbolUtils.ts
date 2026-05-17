import type {
  EditorElement,
  PageJson,
  SongLineElement,
  SymbolElement,
} from "../types/editorDocument";

// const SONG_LINE_HEIGHT = 92;

function isSongLineElement(element: EditorElement): element is SongLineElement {
  return element.type === "songLine";
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

  let baseY = songLine.y;

  if (attachment.row === "lyrics") {
    baseY = songLine.y + 42;
  }

  if (attachment.row === "chordsTop") {
    baseY = songLine.y + 22;
  }

  return {
    x: baseX,
    y: baseY + (attachment.offsetY ?? 0),
  };
}

export function isAttachedSymbol(symbol: SymbolElement): boolean {
  return Boolean(symbol.data.attachment);
}