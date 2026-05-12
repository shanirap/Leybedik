import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createDocument,
  deleteDocument as deleteDocumentApi,
  getDocument,
  getDocuments,
} from "../api/documentsApi";
import type { SavedDocument } from "../types/savedDocument";
import { getCurrentUser } from "../utils/authStorage";
import "./DocumentsHome.css";

type SortMode = "updatedDesc" | "createdDesc" | "titleAsc" | "titleDesc";

interface Props {
  onCreateNew: () => void;
  onImportFromScan: () => void;
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
  const t = doc.title?.trim();
  return t ? t : "מסמך ללא שם";
}

export function DocumentsHome({
  onCreateNew,
  onImportFromScan,
  onOpenDocument,
  onLogout,
}: Props) {
  const user = getCurrentUser();
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [searchText, setSearchText] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("updatedDesc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const list = await getDocuments();
      setDocuments(list);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "שגיאה בטעינת המסמכים"
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDocuments();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDocuments]);

  const displayedDocuments = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    let list = documents;
    if (query) {
      list = documents.filter((doc) =>
        docDisplayTitle(doc).toLowerCase().includes(query)
      );
    }

    const sorted = [...list].sort((a, b) => {
      const titleA = docDisplayTitle(a);
      const titleB = docDisplayTitle(b);

      switch (sortMode) {
        case "updatedDesc":
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        case "createdDesc":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "titleAsc":
          return titleA.localeCompare(titleB, "he");
        case "titleDesc":
          return titleB.localeCompare(titleA, "he");
        default:
          return 0;
      }
    });

    return sorted;
  }, [documents, searchText, sortMode]);

  async function handleDelete(id: string | number) {
    const confirmed = confirm("למחוק את המסמך?");
    if (!confirmed) return;

    try {
      await deleteDocumentApi(id);
      await loadDocuments({ silent: true });
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
        contentJson: full.contentJson,
        createdAt: full.createdAt,
        updatedAt: full.updatedAt,
      });
      await loadDocuments({ silent: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : "לא הצלחתי לשכפל את המסמך");
    }
  }

  const initialLoading = loading && documents.length === 0 && !error;
  const loadFailedEmpty =
    !loading && error !== null && documents.length === 0;

  return (
    <main className="documents-home">
      <div className="documents-shell">
        <header className="documents-topbar">
          <div className="documents-title-area">
            <h1 className="documents-main-title">לייבעדיק Studio</h1>
            <p className="documents-subtitle">המסמכים שלי</p>
            {user ? (
              <p className="documents-user">
                שלום, {user.displayName}
              </p>
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
            <button
              type="button"
              className="scan-import-button documents-btn-scan"
              onClick={onImportFromScan}
            >
              יצירה מסריקה
            </button>
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
            <p className="error-state-title">
              לא הצלחתי לטעון את המסמכים
            </p>
            {error ? (
              <p className="error-state-detail">{error}</p>
            ) : null}
            <button
              type="button"
              className="documents-btn-retry"
              onClick={() => void loadDocuments()}
            >
              נסה שוב
            </button>
          </div>
        ) : (
          <>
            <div className="documents-toolbar">
              <input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="חיפוש לפי שם מסמך..."
                className="documents-search"
              />
              <select
                className="documents-sort"
                value={sortMode}
                onChange={(e) =>
                  setSortMode(e.target.value as SortMode)
                }
              >
                <option value="updatedDesc">עודכן לאחרונה</option>
                <option value="createdDesc">נוצר לאחרונה</option>
                <option value="titleAsc">שם א-ת</option>
                <option value="titleDesc">שם ת-א</option>
              </select>
              <span className="documents-count">
                {documents.length} מסמכים
              </span>
            </div>

            {error !== null && documents.length > 0 ? (
              <div className="documents-inline-error" role="alert">
                {error}{" "}
                <button
                  type="button"
                  className="documents-inline-retry"
                  onClick={() => void loadDocuments({ silent: true })}
                >
                  רענון
                </button>
              </div>
            ) : null}

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
                  <button
                    type="button"
                    className="scan-import-button documents-btn-scan empty-state-btn-scan"
                    onClick={onImportFromScan}
                  >
                    יצירה מסריקה
                  </button>
                </div>
              </div>
            ) : displayedDocuments.length === 0 ? (
              <div className="empty-state empty-state-muted">
                <p className="empty-state-title">
                  לא נמצאו מסמכים מתאימים לחיפוש
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
                        onClick={() => handleDuplicate(doc.id)}
                      >
                        שכפל
                      </button>
                      <button
                        type="button"
                        className="document-card-btn document-card-btn-delete"
                        onClick={() => handleDelete(doc.id)}
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
      </div>
    </main>
  );
}
