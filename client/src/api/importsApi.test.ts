import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./client", async () => {
  const actual = await vi.importActual<typeof import("./client")>("./client");
  return {
    ...actual,
    apiRequest: vi.fn(),
  };
});

import { apiRequest } from "./client";
import { importScan, mapScanImportDto } from "./importsApi";

describe("importsApi mapScanImportDto", () => {
  it("מפרסר contentJson כמחרוזת למבנה עורך", () => {
    const inner = {
      version: 1,
      blocks: [
        {
          id: "b1",
          type: "lyrics",
          text: "שורה",
          elements: [],
        },
      ],
    };
    const mapped = mapScanImportDto({
      title: "כותרת",
      contentJson: JSON.stringify(inner),
      warnings: ["אזהרה"],
    });
    expect(mapped.title).toBe("כותרת");
    expect(mapped.contentJson.version).toBe(1);
    expect(mapped.contentJson.blocks).toHaveLength(1);
    expect(mapped.contentJson.blocks[0].text).toBe("שורה");
    expect(mapped.warnings).toEqual(["אזהרה"]);
  });

  it("זורק אם חסר contentJson במחרוזת", () => {
    expect(() =>
      mapScanImportDto({ title: "x", warnings: [] })
    ).toThrow(/contentJson/);
  });

  it("מחזיר warnings ריק כברירת מחדל", () => {
    const mapped = mapScanImportDto({
      title: "טיוטה",
      contentJson: '{"version":1,"blocks":[]}',
    });
    expect(mapped.warnings).toEqual([]);
  });
});

describe("importsApi importScan", () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockReset();
  });

  it("503 מחזיר הודעת עומס קבועה בלי קריאת גוף התשובה", async () => {
    vi.mocked(apiRequest).mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: "INTERNAL STACK TRACE SHOULD NOT SURFACE",
          stackTrace: "...",
        }),
        { status: 503 }
      )
    );

    await expect(importScan(new File([], "x.png"))).rejects.toThrow(
      "שירות הזיהוי עמוס כרגע. נסי שוב בעוד דקה."
    );
  });

  it("שגיאת 5xx אחרת מחזירה הודעה כללית", async () => {
    vi.mocked(apiRequest).mockResolvedValue(
      new Response(
        JSON.stringify({
          title: "Server Error",
          detail: "GeminiVisionClient threw …",
        }),
        { status: 502 }
      )
    );

    await expect(importScan(new File([], "x.png"))).rejects.toThrow(
      "לא הצלחנו לזהות את הדף. נסי שוב או העלי קובץ אחר."
    );
  });

  it("400 משתמש בהודעת השרת", async () => {
    vi.mocked(apiRequest).mockResolvedValue(
      new Response(JSON.stringify({ message: "לא הועלה קובץ." }), {
        status: 400,
      })
    );

    await expect(importScan(new File([], "x.png"))).rejects.toThrow(
      "לא הועלה קובץ."
    );
  });
});
