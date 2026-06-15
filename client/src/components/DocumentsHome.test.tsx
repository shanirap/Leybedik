import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DocumentsHome } from "./DocumentsHome";
import type { SavedDocument } from "../types/savedDocument";
import type { DocumentFolder } from "../types/savedDocument";
vi.mock("../utils/authStorage", () => ({
  getCurrentUser: () => ({
    id: 1,
    email: "test@example.com",
    displayName: "משתמשת בדיקה",
    token: "fake-token",
  }),
}));

const mockGetDocuments = vi.fn();
const mockGetFolders = vi.fn();
const mockCreateFolder = vi.fn();
const mockUpdateFolder = vi.fn();
const mockDeleteFolder = vi.fn();
const mockDeleteDocument = vi.fn();
const mockGetDocument = vi.fn();
const mockCreateDocument = vi.fn();

vi.mock("../api/documentsApi", () => ({
  getDocuments: () => mockGetDocuments(),
  getDocument: (id: string | number) => mockGetDocument(id),
  createDocument: (document: SavedDocument) => mockCreateDocument(document),
  deleteDocument: (id: string | number) => mockDeleteDocument(id),
}));

vi.mock("../api/foldersApi", () => ({
  getFolders: () => mockGetFolders(),
  createFolder: (name: string) => mockCreateFolder(name),
  updateFolder: (id: number, name: string) => mockUpdateFolder(id, name),
  deleteFolder: (id: number) => mockDeleteFolder(id),
}));

function emptyContent() {
  return {
    version: 2,
    blocks: [],
    pages: [
      {
        id: "page-1",
        width: 794,
        height: 1123,
        elements: [],
      },
    ],
  };
}

const folders: DocumentFolder[] = [
  {
    id: 10,
    name: "גיטרה",
    documentsCount: 2,
  },
  {
    id: 20,
    name: "כינור",
    documentsCount: 1,
  },
  {
    id: 30,
    name: "ריקה",
    documentsCount: 0,
  },
];

const documents: SavedDocument[] = [
  {
    id: 1,
    title: "שיר גיטרה",
    folderId: 10,
    folderName: "גיטרה",
    contentJson: emptyContent(),
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-01-02T10:00:00Z",
  },
  {
    id: 2,
    title: "תרגול כינור",
    folderId: 20,
    folderName: "כינור",
    contentJson: emptyContent(),
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-01-03T10:00:00Z",
  },
  {
    id: 3,
    title: "מסמך ישן",
    folderId: null,
    folderName: null,
    contentJson: emptyContent(),
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-01-04T10:00:00Z",
  },
];

function renderHome() {
  return render(
    <DocumentsHome
      onCreateNew={vi.fn()}
      onImportFromScan={vi.fn()}
      onOpenDocument={vi.fn()}
      onLogout={vi.fn()}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  mockGetDocuments.mockResolvedValue(documents);
  mockGetFolders.mockResolvedValue(folders);
  mockDeleteDocument.mockResolvedValue(undefined);
  mockGetDocument.mockResolvedValue(documents[0]);
  mockCreateDocument.mockResolvedValue({
    ...documents[0],
    id: 99,
    title: "שיר גיטרה - עותק",
  });
  mockCreateFolder.mockResolvedValue({
    id: 30,
    name: "תיקייה חדשה",
    documentsCount: 0,
  });
  mockUpdateFolder.mockImplementation((id: number, name: string) =>
    Promise.resolve({
      id,
      name,
      documentsCount: 0,
    })
  );
  mockDeleteFolder.mockResolvedValue(undefined);
  vi.stubGlobal("confirm", vi.fn(() => true));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("DocumentsHome", () => {
  it("מציג תיקיות שהגיעו מהשרת", async () => {
    renderHome();

    expect(await screen.findByText("גיטרה")).toBeInTheDocument();
    expect(screen.getByText("כינור")).toBeInTheDocument();
    expect(screen.getByText("ללא תיקייה")).toBeInTheDocument();
  });

  it("לחיצה על תיקייה מציגה רק את המסמכים שלה", async () => {
    const user = userEvent.setup();

    renderHome();

const guitarFolder = await screen.findByRole("button", { name: /גיטרה/i });
await user.click(guitarFolder);
    expect(await screen.findByText("שיר גיטרה")).toBeInTheDocument();
    expect(screen.queryByText("תרגול כינור")).not.toBeInTheDocument();
    expect(screen.queryByText("מסמך ישן")).not.toBeInTheDocument();
  });

  it("מסמכים בלי folderId מופיעים תחת ללא תיקייה", async () => {
    const user = userEvent.setup();

    renderHome();

    const noFolder = await screen.findByRole("button", { name: /ללא תיקייה/i });
    await user.click(noFolder);

    expect(await screen.findByText("מסמך ישן")).toBeInTheDocument();
    expect(screen.queryByText("שיר גיטרה")).not.toBeInTheDocument();
    expect(screen.queryByText("תרגול כינור")).not.toBeInTheDocument();
  });

  it("חיפוש בתוך תיקייה מסנן מסמכים לפי שם", async () => {
    const user = userEvent.setup();

    renderHome();

const guitarFolder = await screen.findByRole("button", { name: /גיטרה/i });
await user.click(guitarFolder);
    const search = screen.getByPlaceholderText("חיפוש לפי שם מסמך...");
    await user.type(search, "לא קיים");

    expect(screen.queryByText("שיר גיטרה")).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "שיר");

    expect(await screen.findByText("שיר גיטרה")).toBeInTheDocument();
  });

  it("כפתור פתח מפעיל onOpenDocument עם מזהה המסמך", async () => {
    const user = userEvent.setup();
    const onOpenDocument = vi.fn();

    render(
      <DocumentsHome
        onCreateNew={vi.fn()}
        onImportFromScan={vi.fn()}
        onOpenDocument={onOpenDocument}
        onLogout={vi.fn()}
      />
    );

const guitarFolder = await screen.findByRole("button", { name: /גיטרה/i });
await user.click(guitarFolder);
    const card = screen.getByText("שיר גיטרה").closest("article");
    expect(card).not.toBeNull();

    await user.click(within(card as HTMLElement).getByText("פתח"));

    expect(onOpenDocument).toHaveBeenCalledWith(1);
  });

  it("מחיקת מסמך קוראת ל-api ומרעננת רשימה", async () => {
    const user = userEvent.setup();

    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderHome();

const guitarFolder = await screen.findByRole("button", { name: /גיטרה/i });
await user.click(guitarFolder);
    const card = screen.getByText("שיר גיטרה").closest("article");
    expect(card).not.toBeNull();

    await user.click(within(card as HTMLElement).getByText("מחק"));

    expect(mockDeleteDocument).toHaveBeenCalledWith(1);

    await waitFor(() => {
      expect(mockGetDocuments).toHaveBeenCalledTimes(2);
    });
  });

  it("שכפול מסמך יוצר עותק עם אותה תיקייה", async () => {
    const user = userEvent.setup();

    renderHome();

const guitarFolder = await screen.findByRole("button", { name: /גיטרה/i });
await user.click(guitarFolder);
    const card = screen.getByText("שיר גיטרה").closest("article");
    expect(card).not.toBeNull();

    await user.click(within(card as HTMLElement).getByText("שכפל"));

    expect(mockGetDocument).toHaveBeenCalledWith(1);
    expect(mockCreateDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "שיר גיטרה - עותק",
        folderId: 10,
        folderName: "גיטרה",
      })
    );
  });

  it("מציג מחק רק לתיקייה ריקה", async () => {
    renderHome();

    await screen.findByText("ריקה");

    const emptyFolderCard = screen
      .getByText("ריקה")
      .closest("button") as HTMLElement;
    const guitarFolderCard = screen
      .getByText("גיטרה")
      .closest("button") as HTMLElement;

    expect(within(emptyFolderCard).getByText("מחק")).toBeInTheDocument();
    expect(within(guitarFolderCard).queryByText("מחק")).not.toBeInTheDocument();
  });

  it("מחיקת תיקייה ריקה קוראת לשרת ומסירה אותה מהמסך", async () => {
    const user = userEvent.setup();

    renderHome();

    const emptyFolderCard = (await screen.findByText("ריקה")).closest(
      "button"
    ) as HTMLElement;

    await user.click(within(emptyFolderCard).getByText("מחק"));

    await waitFor(() => {
      expect(mockDeleteFolder).toHaveBeenCalledWith(30);
    });

    await waitFor(() => {
      expect(screen.queryByText("ריקה")).not.toBeInTheDocument();
    });
  });

  it("מציג מחק תיקייה בתצוגת תיקייה פתוחה וריקה", async () => {
    const user = userEvent.setup();

    renderHome();

    const emptyFolderCard = (await screen.findByText("ריקה")).closest(
      "button"
    ) as HTMLElement;

    await user.click(emptyFolderCard);

    expect(await screen.findByText("מחק תיקייה")).toBeInTheDocument();
  });
});
