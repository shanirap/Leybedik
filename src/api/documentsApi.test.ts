import { describe, expect, it } from "vitest";
import { parseContentJson } from "./documentsApi";

describe("documentsApi — מיפוי contentJson", () => {
  it("parseContentJson מחזיר אובייקט על JSON תקין נשלח כמחרוזת", () => {
    const raw = JSON.stringify({
      version: 1,
      blocks: [{ id: "b", type: "lyrics", text: "hello", elements: [] }],
    });
    const parsed = parseContentJson(raw);
    expect(parsed.version).toBe(1);
    expect(parsed.blocks).toHaveLength(1);
    expect(parsed.blocks[0].text).toBe("hello");
  });

  it("parseContentJson על מחרוזת לא תקינה מחזיר תוכן ריק", () => {
    const parsed = parseContentJson("%%%");
expect(parsed.version).toBe(2);    expect(parsed.blocks).toEqual([]);
  });

  it("parseContentJson על אובייקט בלי blocks מחזיר ריק", () => {
    const parsed = parseContentJson(JSON.stringify({ version: 1 }));
    expect(parsed.blocks).toEqual([]);
  });

  it("שליחת גוף כמו לשרת — stringify של אובייקט ניתן לפרסור חזרה", () => {
    const doc = {
      version: 1,
      blocks: [
        {
          id: "1",
          type: "explain" as const,
          title: "",
          text: "",
          elements: [] as [],
        },
      ],
    };
    const wire = JSON.stringify(doc);
    expect(typeof wire).toBe("string");
    const back = parseContentJson(wire);
    expect(back.blocks[0]?.type).toBe("explain");
  });
});
