import { describe, expect, it } from "vitest";
import {
  createEmptyEditorContent,
  extractDocumentJson,
  isEditorDocumentContent,
  renderDocumentFromJson,
} from "./editorDocumentSerializer";

describe("editorDocumentSerializer", () => {
  it("createEmptyEditorContent מחזיר גרסה 1 ו-blocks ריק", () => {
    const empty = createEmptyEditorContent();
    expect(empty.version).toBe(1);
    expect(empty.blocks).toEqual([]);
  });

  it("isEditorDocumentContent מזהה מבנה תקין ודוחה קלט לא תקין", () => {
    expect(isEditorDocumentContent({ version: 1, blocks: [] })).toBe(true);
    expect(isEditorDocumentContent({ version: 1, blocks: [{}] })).toBe(true);
    expect(isEditorDocumentContent(null)).toBe(false);
    expect(isEditorDocumentContent({})).toBe(false);
    expect(isEditorDocumentContent({ version: "1", blocks: [] })).toBe(false);
  });

  it("extractDocumentJson על שורש ריק לא זורק ומחזיר blocks ריק", () => {
    const root = document.createElement("div");
    const json = extractDocumentJson(root);
    expect(json.blocks).toEqual([]);
    expect(json.version).toBe(1);
  });

  it("extractDocumentJson מחלץ טקסט מבלוק מילים פשוט", () => {
    const root = document.createElement("div");
    const block = document.createElement("div");
    block.className = "block-unit";
    block.dataset.blockId = "bid-1";
    block.innerHTML = `
      <div class="chord-lane"></div>
      <textarea class="lyrics-input"></textarea>
    `;
    const ta = block.querySelector("textarea")!;
    ta.value = "שורה לבדיקה";
    root.appendChild(block);

    const json = extractDocumentJson(root);
    expect(json.blocks).toHaveLength(1);
    expect(json.blocks[0].type).toBe("lyrics");
    expect(json.blocks[0].text).toBe("שורה לבדיקה");
  });

  it("renderDocumentFromJson ואז extract מחזירים גרסה ומספר בלוקים תואם", () => {
    const canvas = document.createElement("div");
    const content = createEmptyEditorContent();
    content.blocks.push({
      id: "x",
      type: "lyrics",
      text: "טקסט",
      elements: [],
    });
    renderDocumentFromJson(content, canvas, document);
    const roundTrip = extractDocumentJson(canvas);
    expect(roundTrip.version).toBe(1);
    expect(roundTrip.blocks).toHaveLength(1);
    expect(roundTrip.blocks[0].text).toBe("טקסט");
  });
});
