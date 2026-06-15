import type { LyricsRun } from "./lyricsStyleSpans";

export interface TextSelectionOffsets {
  start: number;
  end: number;
}

function getTextNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }

  return nodes;
}

function findFirstTextNode(node: Node): Text | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return node as Text;
  }

  for (const child of Array.from(node.childNodes)) {
    const found = findFirstTextNode(child);

    if (found) {
      return found;
    }
  }

  return null;
}

function findLastTextNode(node: Node): Text | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return node as Text;
  }

  for (let index = node.childNodes.length - 1; index >= 0; index -= 1) {
    const found = findLastTextNode(node.childNodes[index]);

    if (found) {
      return found;
    }
  }

  return null;
}

function resolveTextOffset(
  root: HTMLElement,
  container: Node,
  offset: number
): number {
  if (container.nodeType === Node.TEXT_NODE) {
    return getTextOffsetInElement(root, container, offset);
  }

  if (container.nodeType !== Node.ELEMENT_NODE) {
    return 0;
  }

  const element = container as Element;

  if (offset < element.childNodes.length) {
    const firstText = findFirstTextNode(element.childNodes[offset]);

    if (firstText) {
      return getTextOffsetInElement(root, firstText, 0);
    }
  }

  if (offset > 0) {
    const lastText = findLastTextNode(element.childNodes[offset - 1]);

    if (lastText) {
      return (
        getTextOffsetInElement(root, lastText, 0) + lastText.data.length
      );
    }
  }

  return getTextNodes(root).reduce((sum, node) => sum + node.data.length, 0);
}

export function getTextOffsetInElement(
  root: HTMLElement,
  targetNode: Node,
  targetOffset: number
): number {
  let offset = 0;

  for (const textNode of getTextNodes(root)) {
    if (textNode === targetNode) {
      return offset + targetOffset;
    }

    offset += textNode.data.length;
  }

  return offset;
}

export function getSelectionOffsets(root: HTMLElement): TextSelectionOffsets {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return { start: 0, end: 0 };
  }

  const range = selection.getRangeAt(0);

  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return { start: 0, end: 0 };
  }

  const start = resolveTextOffset(
    root,
    range.startContainer,
    range.startOffset
  );
  const end = resolveTextOffset(root, range.endContainer, range.endOffset);

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

export function setSelectionOffsets(
  root: HTMLElement,
  offsets: TextSelectionOffsets
): void {
  const selection = window.getSelection();

  if (!selection) {
    return;
  }

  const startPos = findNodePosition(root, offsets.start);
  const endPos = findNodePosition(root, offsets.end);

  if (!startPos || !endPos) {
    return;
  }

  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}

function findNodePosition(
  root: HTMLElement,
  targetOffset: number
): { node: Text; offset: number } | null {
  let offset = 0;

  for (const textNode of getTextNodes(root)) {
    const nextOffset = offset + textNode.data.length;

    if (targetOffset <= nextOffset) {
      return {
        node: textNode,
        offset: Math.max(0, targetOffset - offset),
      };
    }

    offset = nextOffset;
  }

  const textNodes = getTextNodes(root);
  const lastNode = textNodes.at(-1);

  if (!lastNode) {
    return null;
  }

  return {
    node: lastNode,
    offset: lastNode.data.length,
  };
}

export function buildLyricsEditorFragment(runs: LyricsRun[]): DocumentFragment {
  const fragment = document.createDocumentFragment();

  for (const run of runs) {
    const classes = [
      run.bold ? "lyrics-run-bold" : "",
      run.underline === "solid" ? "lyrics-run-underline-solid" : "",
      run.underline === "dashed" ? "lyrics-run-underline-dashed" : "",
    ].filter(Boolean);

    if (classes.length > 0) {
      const span = document.createElement("span");
      span.className = classes.join(" ");
      span.textContent = run.text;
      fragment.appendChild(span);
    } else {
      fragment.appendChild(document.createTextNode(run.text));
    }
  }

  return fragment;
}

export function getClickedCharacterIndexInEditor(
  root: HTMLElement,
  clientX: number,
  clientY: number
): number | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number
    ) => { offsetNode: Node; offset: number } | null;
  };

  let range: Range | null = null;

  if (doc.caretRangeFromPoint) {
    range = doc.caretRangeFromPoint(clientX, clientY);
  } else if (doc.caretPositionFromPoint) {
    const position = doc.caretPositionFromPoint(clientX, clientY);

    if (position) {
      range = document.createRange();
      range.setStart(position.offsetNode, position.offset);
      range.collapse(true);
    }
  }

  if (!range || !root.contains(range.startContainer)) {
    return null;
  }

  return resolveTextOffset(
    root,
    range.startContainer,
    range.startOffset
  );
}

export function getCharacterCenterRelativeTo(
  root: HTMLElement,
  charIndex: number,
  ancestor: HTMLElement
): { x: number; y: number } | null {
  const position = findNodePosition(root, charIndex);

  if (!position) {
    return null;
  }

  const range = document.createRange();
  range.setStart(position.node, position.offset);
  range.setEnd(
    position.node,
    Math.min(position.offset + 1, position.node.data.length)
  );

  const rects = range.getClientRects();
  const rect = rects[0] ?? range.getBoundingClientRect();
  const ancestorRect = ancestor.getBoundingClientRect();

  return {
    x: rect.left - ancestorRect.left + rect.width / 2,
    y: rect.top - ancestorRect.top + rect.height / 2,
  };
}

export function getLyricsCaretCenterRelativeTo(
  root: HTMLElement,
  charIndex: number,
  ancestor: HTMLElement
): { x: number; y: number } | null {
  const center = getCharacterCenterRelativeTo(root, charIndex, ancestor);

  if (center) {
    return center;
  }

  const hasText = getTextNodes(root).some((node) => node.data.length > 0);

  if (hasText) {
    return null;
  }

  const ancestorRect = ancestor.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();
  const style = window.getComputedStyle(root);
  const fontSize = Number.parseFloat(style.fontSize || "19");
  const paddingTop = Number.parseFloat(style.paddingTop || "0");

  return {
    x: 16,
    y: rootRect.top - ancestorRect.top + paddingTop + fontSize * 0.55,
  };
}

export function getCharacterCenterInEditor(
  root: HTMLElement,
  charIndex: number
): { x: number; y: number } | null {
  const position = findNodePosition(root, charIndex);

  if (!position) {
    return null;
  }

  const range = document.createRange();
  range.setStart(position.node, position.offset);
  range.setEnd(
    position.node,
    Math.min(position.offset + 1, position.node.data.length)
  );

  const rects = range.getClientRects();
  const rect = rects[0] ?? range.getBoundingClientRect();
  const rootRect = root.getBoundingClientRect();

  return {
    x: rect.left - rootRect.left + rect.width / 2,
    y: rect.top - rootRect.top + rect.height / 2,
  };
}
