import { describe, expect, it, vi, beforeEach } from "vitest";
import { deleteFolder } from "./foldersApi";

const mockApiRequest = vi.fn();

vi.mock("./client", () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  readApiError: async (res: Response) => {
    const data = (await res.json()) as { message?: string };
    return data.message ?? "שגיאה";
  },
}));

describe("foldersApi.deleteFolder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("succeeds on empty folder delete", async () => {
    mockApiRequest.mockResolvedValue({
      ok: true,
      status: 204,
    });

    await expect(deleteFolder(12)).resolves.toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith("/folders/12", {
      method: "DELETE",
    });
  });

  it("throws conflict message when folder has documents", async () => {
    mockApiRequest.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ message: "לא ניתן למחוק תיקייה שיש בה מסמכים." }),
    });

    await expect(deleteFolder(12)).rejects.toThrow(
      "לא ניתן למחוק תיקייה שיש בה מסמכים."
    );
  });

  it("throws not found for missing folder", async () => {
    mockApiRequest.mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(deleteFolder(12)).rejects.toThrow("התיקייה לא נמצאה");
  });
});
