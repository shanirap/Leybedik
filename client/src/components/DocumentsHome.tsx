import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createDocument,
  deleteDocument as deleteDocumentApi,
  getDocument,
  getDocuments,
} from "../api/documentsApi";
import {
  createFolder,
  getFolders,
  updateFolder,
} from "../api/foldersApi";
import type { DocumentFolder, SavedDocument } from "../types/savedDocument";
import { getCurrentUser } from "../utils/authStorage";
import "./DocumentsHome.css";

type SortMode = "updatedDesc" | "createdDesc" | "titleAsc" | "titleDesc";

interface Props {
  onCreateNew: () => void;
  onImportFromScan?: () => void;
  onOpenDocument: (documentId: string | number) => void;
  onLogout: () => void;
}

function formatDocDate(iso: string) {
  return new Date(iso).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function docDisplayTitle(doc: SavedDocument) {
  const title = doc.title?.trim();
  return title ? title : "מסמך ללא שם";
}

export function DocumentsHome({
  onCreateNew,
  onImportFromScan,
  onOpenDocument,
  onLogout,
}: Props) {
  const user = getCurrentUser();

  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  type OpenedFolderId = number | "unfiled" | null;
  const [openedFolderId, setOpenedFolderId] = useState<OpenedFolderId>(null);  const [searchText, setSearchText] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("updatedDesc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

const openedFolder =
  typeof openedFolderId === "number"
    ? folders.find((folder) => folder.id === openedFolderId) ?? null
    : null;

  const loadHomeData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;

    if (!silent) {
      setLoading(true);
    }

    setError(null);

    try {
      const [documentsList, foldersList] = await Promise.all([
        getDocuments(),
        getFolders(),
      ]);

      setDocuments(documentsList);
      setFolders(foldersList);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בטעינת המסמכים");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadHomeData();
  }, [loadHomeData]);

  const displayedDocuments = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    let list = documents;

    if (openedFolderId === "unfiled") {
  list = list.filter((doc) => doc.folderId == null);
} else if (typeof openedFolderId === "number") {
  list = list.filter((doc) => doc.folderId === openedFolderId);
}

    if (query) {
      list = list.filter((doc) =>
        docDisplayTitle(doc).toLowerCase().includes(query)
      );
    }

    return [...list].sort((a, b) => {
      const titleA = docDisplayTitle(a);
      const titleB = docDisplayTitle(b);

      switch (sortMode) {
        case "updatedDesc":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

        case "createdDesc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

        case "titleAsc":
          return titleA.localeCompare(titleB, "he");

        case "titleDesc":
          return titleB.localeCompare(titleA, "he");

        default:
          return 0;
      }
    });
  }, [documents, openedFolderId, searchText, sortMode]);

  async function handleDelete(id: string | number) {
    const confirmed = confirm("למחוק את המסמך?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteDocumentApi(id);
      await loadHomeData({ silent: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "שגיאה במחיקה");
    }
  }

  async function handleDuplicate(id: string | number) {
    try {
      const full = await getDocument(id);

      await createDocument({
        id: `temp-${crypto.randomUUID()}`,
        title: `${full.title || "מסמך ללא שם"} - עותק`,
        folderId: full.folderId ?? null,
        folderName: full.folderName ?? null,
        contentJson: full.contentJson,
        createdAt: full.createdAt,
        updatedAt: full.updatedAt,
      });

      await loadHomeData({ silent: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "לא הצלחתי לשכפל את המסמך");
    }
  }

  async function handleCreateFolder() {
    const name = window.prompt("שם תיקייה חדשה");

    if (!name?.trim()) {
      return;
    }

    try {
      const folder = await createFolder(name.trim());
      setFolders((current) => [...current, folder]);
      setOpenedFolderId(folder.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "שגיאה ביצירת תיקייה");
    }
  }

  async function handleRenameFolder(folder: DocumentFolder) {
    const name = window.prompt("שם חדש לתיקייה", folder.name);

    if (!name?.trim() || name.trim() === folder.name) {
      return;
    }

    try {
      const updated = await updateFolder(folder.id, name.trim());

      setFolders((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );

      setDocuments((current) =>
        current.map((doc) =>
          doc.folderId === updated.id
            ? {
                ...doc,
                folderName: updated.name,
              }
            : doc
        )
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "שגיאה בשינוי שם תיקייה");
    }
  }

  const initialLoading = loading && documents.length === 0 && !error;
  const loadFailedEmpty = !loading && error !== null && documents.length === 0;

  return (
    <main className="documents-home">
      <div className="documents-shell">
        <header className="documents-topbar">
          <div className="documents-title-area">
            <h1 className="documents-main-title">לייבעדיק Studio</h1>
            <p className="documents-subtitle">המסמכים שלי</p>

            {user ? (
              <p className="documents-user">שלום, {user.displayName}</p>
            ) : null}
          </div>

          <div className="documents-actions">
            <button
              type="button"
              className="documents-btn-new"
              onClick={onCreateNew}
            >
              + מסמך חדש
            </button>

            {onImportFromScan ? (
  <button
    type="button"
    className="scan-import-button documents-btn-scan"
    onClick={onImportFromScan}
  >
    יצירה מסריקה
  </button>
) : null}

            <button
              type="button"
              className="documents-btn-logout"
              onClick={onLogout}
            >
              התנתקות
            </button>
          </div>
        </header>

        {initialLoading ? (
          <div className="loading-state">טוען מסמכים...</div>
        ) : loadFailedEmpty ? (
          <div className="error-state" role="alert">
            <p className="error-state-title">לא הצלחתי לטעון את המסמכים</p>

            {error ? (
              <p className="error-state-detail">{error}</p>
            ) : null}

            <button
              type="button"
              className="documents-btn-retry"
              onClick={() => void loadHomeData()}
            >
              נסה שוב
            </button>
          </div>
        ) : (
          <>
            <div className="documents-toolbar">
              {openedFolderId !== null ? (
                <input
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="חיפוש לפי שם מסמך..."
                  className="documents-search"
                />
              ) : null}

              {openedFolderId !== null ? (
                <select
                  className="documents-sort"
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as SortMode)}
                >
                  <option value="updatedDesc">עודכן לאחרונה</option>
                  <option value="createdDesc">נוצר לאחרונה</option>
                  <option value="titleAsc">שם א-ת</option>
                  <option value="titleDesc">שם ת-א</option>
                </select>
              ) : null}

              <span className="documents-count">
                {openedFolderId === null
                  ? `${documents.length} מסמכים`
                  : `${displayedDocuments.length} מסמכים בתיקייה`}
              </span>
            </div>

            {error !== null && documents.length > 0 ? (
              <div className="documents-inline-error" role="alert">
                {error}{" "}
                <button
                  type="button"
                  className="documents-inline-retry"
                  onClick={() => void loadHomeData({ silent: true })}
                >
                  רענון
                </button>
              </div>
            ) : null}

            {openedFolderId === null ? (
              <section
                className="documents-folders-grid"
                aria-label="תיקיות מסמכים"
              >
                <button
  type="button"
  className="documents-folder-card"
  onClick={() => {
    setSearchText("");
    setOpenedFolderId("unfiled");
  }}
>
  <span className="documents-folder-icon">📂</span>

  <span className="documents-folder-title">ללא תיקייה</span>

  <span className="documents-folder-count">
    {documents.filter((doc) => doc.folderId == null).length} מסמכים
  </span>
</button>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    className="documents-folder-card"
                    onClick={() => {
                      setSearchText("");
                      setOpenedFolderId(folder.id);
                    }}
                  >
                    <span className="documents-folder-icon">📁</span>

                    <span className="documents-folder-title">
                      {folder.name}
                    </span>

                    <span className="documents-folder-count">
                      {
                        documents.filter((doc) => doc.folderId === folder.id)
                          .length
                      }{" "}
                      מסמכים
                    </span>

                    <span
                      role="button"
                      tabIndex={0}
                      className="documents-folder-rename"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleRenameFolder(folder);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.stopPropagation();
                          void handleRenameFolder(folder);
                        }
                      }}
                    >
                      שנה שם
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  className="documents-folder-card documents-folder-card-add"
                  onClick={() => void handleCreateFolder()}
                >
                  <span className="documents-folder-icon">＋</span>
                  <span className="documents-folder-title">תיקייה חדשה</span>
                  <span className="documents-folder-count">הוספה</span>
                </button>
              </section>
            ) : (
              <>
                <div className="documents-folder-open-header">
                  <button
                    type="button"
                    className="documents-folder-back"
                    onClick={() => {
                      setSearchText("");
                      setOpenedFolderId(null);
                    }}
                  >
                    ← חזרה לתיקיות
                  </button>

                  <h2 className="documents-folder-open-title">
  {openedFolderId === "unfiled"
    ? "ללא תיקייה"
    : openedFolder?.name ?? "תיקייה"}
</h2>

                  {openedFolder ? (
                    <button
                      type="button"
                      className="documents-folder-back"
                      onClick={() => void handleRenameFolder(openedFolder)}
                    >
                      שנה שם
                    </button>
                  ) : null}
                </div>

                {documents.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-state-title">עדיין אין מסמכים</p>
                    <p className="empty-state-lead">
                      התחילי ביצירת דף לימוד ראשון
                    </p>

                    <div className="documents-empty-actions">
                      <button
                        type="button"
                        className="documents-btn-new empty-state-btn"
                        onClick={onCreateNew}
                      >
                        + מסמך חדש
                      </button>

                      {onImportFromScan ? (
                            <button
                              type="button"
                              className="scan-import-button"
                              onClick={onImportFromScan}
                            >
                              יצירה מסריקה
                            </button>
                          ) : null}
                    </div>
                  </div>
                ) : displayedDocuments.length === 0 ? (
                  <div className="empty-state empty-state-muted">
                    <p className="empty-state-title">
                      אין מסמכים בתיקייה הזו
                    </p>
                  </div>
                ) : (
                  <div className="documents-grid">
                    {displayedDocuments.map((doc) => (
                      <article className="document-card" key={String(doc.id)}>
                        <h2 className="document-card-title">
                          {docDisplayTitle(doc)}
                        </h2>

                        <div className="document-card-meta">
                          <span className="document-card-folder">
                            תיקייה: {doc.folderName ?? "ללא תיקייה"}
                          </span>

                          <span className="document-card-updated">
                            עודכן: {formatDocDate(doc.updatedAt)}
                          </span>

                          <span className="document-card-created">
                            נוצר: {formatDocDate(doc.createdAt)}
                          </span>
                        </div>

                        <div className="document-card-actions">
                          <button
                            type="button"
                            className="document-card-btn document-card-btn-open"
                            onClick={() => onOpenDocument(doc.id)}
                          >
                            פתח
                          </button>

                          <button
                            type="button"
                            className="document-card-btn document-card-btn-dup"
                            onClick={() => void handleDuplicate(doc.id)}
                          >
                            שכפל
                          </button>

                          <button
                            type="button"
                            className="document-card-btn document-card-btn-delete"
                            onClick={() => void handleDelete(doc.id)}
                          >
                            מחק
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}