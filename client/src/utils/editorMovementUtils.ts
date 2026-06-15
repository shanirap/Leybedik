import type {
  EditorElement,
  ImageElement,
  SymbolElement,
  SymbolType,
  TextBoxElement,
} from "../types/editorDocument";

export const KEYBOARD_MOVABLE_SYMBOL_TYPES = new Set<SymbolType>([
  "repeatEnd",
  "arrow",
  "fraction",
  "volta",
  "circleNumber",
  "smallSharp",
]);

export function shouldIgnoreKeyboardMove(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest("input") ||
      target.closest("textarea") ||
      target.closest("select") ||
      target.closest("button") ||
      target.closest("[contenteditable='true']")
  );
}

export function isKeyboardMovableFreeElement(
  element: EditorElement | undefined
): element is TextBoxElement | SymbolElement | ImageElement {
  if (!element) {
    return false;
  }

  if (element.type === "textBox" || element.type === "image") {
    return true;
  }

  if (element.type === "symbol") {
    return KEYBOARD_MOVABLE_SYMBOL_TYPES.has(element.data.symbolType);
  }

  return false;
}

export function getArrowKeyDelta(
  key: string,
  step: number
): { deltaX: number; deltaY: number } | null {
  if (key === "ArrowLeft") {
    return { deltaX: -step, deltaY: 0 };
  }

  if (key === "ArrowRight") {
    return { deltaX: step, deltaY: 0 };
  }

  if (key === "ArrowUp") {
    return { deltaX: 0, deltaY: -step };
  }

  if (key === "ArrowDown") {
    return { deltaX: 0, deltaY: step };
  }

  return null;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampFreeElementPosition(
  x: number,
  y: number,
  width: number,
  height: number,
  pageWidth: number,
  pageHeight: number
): { x: number; y: number } {
  return {
    x: clamp(x, 0, pageWidth - width),
    y: clamp(y, 0, pageHeight - height),
  };
}

export function applyAttachedSymbolKeyboardOffset(
  symbol: SymbolElement,
  deltaX: number
): SymbolElement {
  const attachment = symbol.data.attachment;

  if (!attachment) {
    return symbol;
  }

  return {
    ...symbol,
    data: {
      ...symbol.data,
      attachment: {
        ...attachment,
        offsetX: attachment.offsetX + deltaX,
        offsetY: attachment.offsetY ?? 0,
      },
    },
  };
}
