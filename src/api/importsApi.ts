import type { EditorDocumentContent } from "../types/editorDocument";
import { apiRequest, readApiError } from "./client";
import { parseContentJson } from "./documentsApi";

const SCAN_OVERLOAD_MESSAGE =
  "שירות הזיהוי עמוס כרגע. נסי שוב בעוד דקה.";
const SCAN_GENERIC_FAILURE_MESSAGE =
  "לא הצלחנו לזהות את הדף. נסי שוב או העלי קובץ אחר.";

export interface ScanImportResponse {
  title: string;
  contentJson: EditorDocumentContent;
  warnings: string[];
}

interface ScanImportResponseDto {
  title?: string;
  contentJson?: string;
  warnings?: string[];
}

/** לטסטים ולמיפוי תשובת השרת */
export function mapScanImportDto(dto: ScanImportResponseDto): ScanImportResponse {
  const rawJson = dto.contentJson;
  if (typeof rawJson !== "string") {
    throw new Error("תשובת השרת לא כללה contentJson תקין.");
  }
  return {
    title: typeof dto.title === "string" ? dto.title : "",
    contentJson: parseContentJson(rawJson),
    warnings: Array.isArray(dto.warnings) ? dto.warnings : [],
  };
}

export async function importScan(file: File): Promise<ScanImportResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiRequest("/imports/scan", {
    method: "POST",
    body: formData,
  });

  if (res.status === 401) {
    throw new Error("פג תוקף ההתחברות. התחברי מחדש.");
  }

  if (res.status === 503) {
    console.error("importScan: שירות זיהוי לא זמין (503)");
    throw new Error(SCAN_OVERLOAD_MESSAGE);
  }

  if (!res.ok) {
    if (res.status >= 500) {
      console.error("importScan: שגיאת שרת", res.status);
      throw new Error(SCAN_GENERIC_FAILURE_MESSAGE);
    }
    throw new Error(await readApiError(res));
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error("תשובת השרת לא בפורמט JSON תקין.");
  }

  if (typeof body !== "object" || body === null) {
    throw new Error("תשובת השרת ריקה או לא תקינה.");
  }

  return mapScanImportDto(body as ScanImportResponseDto);
}
