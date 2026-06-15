import { describe, expect, it, vi } from "vitest";
import { buildLyricsRuns } from "./lyricsStyleSpans";
import {
  buildLyricsEditorFragment,
  getCharacterCenterInEditor,
  getCharacterCenterRelativeTo,
  getLyricsCaretCenterRelativeTo,
  getSelectionOffsets,
  getTextOffsetInElement,
  setSelectionOffsets,
} from "./lyricsEditorUtils";

function mountEditor(html = ""): HTMLDivElement {
  const editor = document.createElement("div");
  editor.contentEditable = "true";
  editor.style.cssText =
    "position:absolute;left:100px;top:200px;width:300px;font-size:19px;";
  editor.innerHTML = html;
  document.body.appendChild(editor);
  return editor;
}

function mountAncestor(): HTMLDivElement {
  const ancestor = document.createElement("div");
  ancestor.className = "song-line-element";
  ancestor.style.cssText =
    "position:absolute;left:80px;top:150px;width:400px;height:78px;";
  document.body.appendChild(ancestor);
  return ancestor;
}

function selectTextNode(
  node: Text,
  start: number,
  end: number = start
): void {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const selection = window.getSelection();

  selection?.removeAllRanges();
  selection?.addRange(range);
}

describe("lyricsEditorUtils", () => {
  it("buildLyricsEditorFragment renders styled spans and plain text nodes", () => {
    const fragment = buildLyricsEditorFragment(
      buildLyricsRuns("שלום עולם", [
        {
          id: "s1",
          start: 0,
          end: 5,
          bold: true,
          underline: "solid",
        },
      ])
    );

    const container = document.createElement("div");
    container.appendChild(fragment);

    expect(container.querySelector(".lyrics-run-bold")).not.toBeNull();
    expect(container.querySelector(".lyrics-run-underline-solid")).not.toBeNull();
    expect(container.childNodes.length).toBe(2);
    expect(container.textContent).toBe("שלום עולם");
  });

  it("getTextOffsetInElement returns index inside plain and styled text", () => {
    const editor = mountEditor(
      '<span class="lyrics-run-bold">שלום</span> עולם'
    );
    const textNodes = Array.from(editor.childNodes).flatMap((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return [node as Text];
      }

      return Array.from(node.childNodes).filter(
        (child): child is Text => child.nodeType === Node.TEXT_NODE
      );
    });

    expect(getTextOffsetInElement(editor, textNodes[0], 2)).toBe(2);
    expect(getTextOffsetInElement(editor, textNodes[1], 1)).toBe(5);
  });

  it("getSelectionOffsets and setSelectionOffsets roundtrip selection", () => {
    const editor = mountEditor("123456789");
    const textNode = editor.firstChild as Text;

    selectTextNode(textNode, 2, 5);
    expect(getSelectionOffsets(editor)).toEqual({ start: 2, end: 5 });

    setSelectionOffsets(editor, { start: 1, end: 4 });
    expect(getSelectionOffsets(editor)).toEqual({ start: 1, end: 4 });
  });

  it("getCharacterCenterRelativeTo uses ancestor coordinates for circle placement", () => {
    const ancestor = mountAncestor();
    const editor = mountEditor("ABCDEF");
    ancestor.appendChild(editor);

    const mockRect = {
      left: 130,
      top: 210,
      width: 10,
      height: 18,
    } as DOMRect;

    Object.defineProperty(Range.prototype, "getClientRects", {
      configurable: true,
      value: () => [mockRect],
    });
    Object.defineProperty(Range.prototype, "getBoundingClientRect", {
      configurable: true,
      value: () => mockRect,
    });

    vi.spyOn(ancestor, "getBoundingClientRect").mockReturnValue({
      left: 80,
      top: 150,
      width: 400,
      height: 78,
    } as DOMRect);
    vi.spyOn(editor, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 200,
      width: 300,
      height: 28,
    } as DOMRect);

    const relative = getCharacterCenterRelativeTo(editor, 2, ancestor);
    const local = getCharacterCenterInEditor(editor, 2);

    expect(relative).toEqual({ x: 55, y: 69 });
    expect(local).toEqual({ x: 35, y: 19 });
  });

  it("returns null center when editor has no text nodes", () => {
    const editor = mountEditor("");

    expect(getCharacterCenterInEditor(editor, 0)).toBeNull();
  });

  it("getLyricsCaretCenterRelativeTo falls back when lyrics editor is empty", () => {
    const ancestor = mountAncestor();
    const editor = mountEditor("");
    ancestor.appendChild(editor);

    const center = getLyricsCaretCenterRelativeTo(editor, 0, ancestor);

    expect(center).not.toBeNull();
    expect(center?.x).toBe(16);
    expect(center?.y).toBeGreaterThan(0);
  });
});
