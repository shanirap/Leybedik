import { describe, expect, it } from "vitest";
import {
  applyAttachedSymbolKeyboardOffset,
  clamp,
  clampFreeElementPosition,
  getArrowKeyDelta,
  isKeyboardMovableFreeElement,
  KEYBOARD_MOVABLE_SYMBOL_TYPES,
  shouldIgnoreKeyboardMove,
} from "./editorMovementUtils";
import type { SymbolElement, TextBoxElement } from "../types/editorDocument";

function createCircleSymbol(
  overrides: Partial<SymbolElement["data"]> = {}
): SymbolElement {
  return {
    id: "circle-1",
    type: "symbol",
    x: 0,
    y: 0,
    width: 20,
    height: 24,
    zIndex: 2,
    data: {
      symbolType: "circleNumber",
      attachment: {
        songLineId: "song-line-1",
        row: "lyrics",
        offsetX: 50,
        offsetY: -6,
      },
      ...overrides,
    },
  };
}

describe("editorMovementUtils", () => {
  describe("getArrowKeyDelta", () => {
    it("maps arrow keys to axis deltas", () => {
      expect(getArrowKeyDelta("ArrowLeft", 2)).toEqual({ deltaX: -2, deltaY: 0 });
      expect(getArrowKeyDelta("ArrowRight", 2)).toEqual({ deltaX: 2, deltaY: 0 });
      expect(getArrowKeyDelta("ArrowUp", 10)).toEqual({ deltaX: 0, deltaY: -10 });
      expect(getArrowKeyDelta("ArrowDown", 10)).toEqual({ deltaX: 0, deltaY: 10 });
    });

    it("returns null for non-arrow keys", () => {
      expect(getArrowKeyDelta("Enter", 2)).toBeNull();
      expect(getArrowKeyDelta("a", 2)).toBeNull();
    });
  });

  describe("clamp and clampFreeElementPosition", () => {
    it("clamps values inside bounds", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-1, 0, 10)).toBe(0);
      expect(clamp(99, 0, 10)).toBe(10);
    });

    it("keeps free elements inside page bounds", () => {
      expect(
        clampFreeElementPosition(800, 1200, 100, 50, 794, 1123)
      ).toEqual({
        x: 694,
        y: 1073,
      });

      expect(clampFreeElementPosition(-5, -3, 100, 50, 794, 1123)).toEqual({
        x: 0,
        y: 0,
      });
    });
  });

  describe("isKeyboardMovableFreeElement", () => {
    it("allows text boxes, images, and selected symbol types", () => {
      const textBox: TextBoxElement = {
        id: "tb-1",
        type: "textBox",
        x: 0,
        y: 0,
        width: 100,
        height: 40,
        zIndex: 1,
        data: {
          text: "hello",
          fontSize: 16,
          fontFamily: "Arial",
          color: "#000",
          bold: false,
          italic: false,
          underline: false,
          textAlign: "right",
          direction: "rtl",
        },
      };

      expect(isKeyboardMovableFreeElement(textBox)).toBe(true);
      expect(
        isKeyboardMovableFreeElement(
          createCircleSymbol({ symbolType: "circleNumber" })
        )
      ).toBe(true);
      expect(
        isKeyboardMovableFreeElement(
          createCircleSymbol({ symbolType: "smallSharp" })
        )
      ).toBe(true);
    });

    it("rejects unsupported symbol types and template elements", () => {
      expect(
        isKeyboardMovableFreeElement(
          createCircleSymbol({ symbolType: "bracket" })
        )
      ).toBe(false);
      expect(
        isKeyboardMovableFreeElement({
          id: "sl-1",
          type: "songLine",
          x: 0,
          y: 0,
          width: 500,
          height: 78,
          zIndex: 1,
          data: {
            lyrics: "",
            lyricsFontSize: 19,
            lyricsFontFamily: "Arial",
            lyricsColor: "#111",
            lyricsBold: false,
            lyricsAlign: "right",
            direction: "rtl",
            chords: [],
            chordFontSize: 14,
            chordColor: "#111",
          },
        })
      ).toBe(false);
    });

    it("includes all keyboard-movable symbol types", () => {
      for (const symbolType of KEYBOARD_MOVABLE_SYMBOL_TYPES) {
        expect(
          isKeyboardMovableFreeElement(
            createCircleSymbol({
              symbolType,
              attachment: {
                songLineId: "song-line-1",
                row: "lyrics",
                offsetX: 0,
              },
            })
          )
        ).toBe(true);
      }
    });
  });

  describe("shouldIgnoreKeyboardMove", () => {
    it("ignores keyboard move when focus is inside editable controls", () => {
      document.body.innerHTML = `
        <input id="input" />
        <textarea id="textarea"></textarea>
        <button id="button"></button>
        <div id="editor" contenteditable="true"></div>
        <div id="plain"></div>
      `;

      expect(
        shouldIgnoreKeyboardMove(document.getElementById("input"))
      ).toBe(true);
      expect(
        shouldIgnoreKeyboardMove(document.getElementById("textarea"))
      ).toBe(true);
      expect(
        shouldIgnoreKeyboardMove(document.getElementById("button"))
      ).toBe(true);
      expect(
        shouldIgnoreKeyboardMove(document.getElementById("editor"))
      ).toBe(true);
      expect(
        shouldIgnoreKeyboardMove(document.getElementById("plain"))
      ).toBe(false);
      expect(shouldIgnoreKeyboardMove(null)).toBe(false);
    });
  });

  describe("applyAttachedSymbolKeyboardOffset", () => {
    it("moves attached circle horizontally with arrow keys", () => {
      const moved = applyAttachedSymbolKeyboardOffset(createCircleSymbol(), 4);

      expect(moved.data.attachment?.offsetX).toBe(54);
      expect(moved.data.attachment?.offsetY).toBe(-6);
    });

    it("does not move lyrics-locked circle vertically with arrow up/down", () => {
      const moved = applyAttachedSymbolKeyboardOffset(createCircleSymbol(), 0);

      expect(moved.data.attachment?.offsetX).toBe(50);
      expect(moved.data.attachment?.offsetY).toBe(-6);

      const movedDown = applyAttachedSymbolKeyboardOffset(createCircleSymbol(), 0);

      expect(movedDown.data.attachment?.offsetY).toBe(-6);
    });

    it("does not move attached arrow vertically with arrow up/down", () => {
      const arrow = createCircleSymbol({
        symbolType: "arrow",
        attachment: {
          songLineId: "song-line-1",
          row: "lyrics",
          offsetX: 20,
          offsetY: 3,
        },
      });

      const moved = applyAttachedSymbolKeyboardOffset(arrow, 2);

      expect(moved.data.attachment?.offsetX).toBe(22);
      expect(moved.data.attachment?.offsetY).toBe(3);
    });

    it("simulates full arrow key sequence for locked circle", () => {
      let symbol = createCircleSymbol();

      for (const key of ["ArrowRight", "ArrowRight", "ArrowUp", "ArrowDown"]) {
        const delta = getArrowKeyDelta(key, 2);

        if (!delta) {
          continue;
        }

        symbol = applyAttachedSymbolKeyboardOffset(symbol, delta.deltaX);
      }

      expect(symbol.data.attachment?.offsetX).toBe(54);
      expect(symbol.data.attachment?.offsetY).toBe(-6);
    });
  });
});
