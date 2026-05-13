import { useEffect, useState } from "react";
import { UNAUTHORIZED_EVENT } from "./api/client";
import {
  createDocument,
  getDocument,
  updateDocument,
} from "./api/documentsApi";
import { AuthPage } from "./components/AuthPage";
import { DocumentsHome } from "./components/DocumentsHome";
import { LeybedikStudio } from "./components/LeybedikStudio";
import { ScanImportDialog } from "./components/ScanImportDialog";
import type { SavedDocument } from "./types/savedDocument";
import { clearAuth, isAuthenticated } from "./utils/authStorage";
import { createEmptyEditorContent } from "./utils/editorDocumentSerializer";

type Screen =
  | { name: "home" }
  | { name: "editor"; document: SavedDocument };

function createEmptyDocument(): SavedDocument {
  const now = new Date().toISOString();

  return {
  id: `temp-${crypto.randomUUID()}`,
  title: "",
  folder: "general",
  contentJson: createEmptyEditorContent(),
  createdAt: now,
  updatedAt: now,
};
}

function App() {
  const [authenticated, setAuthenticated] = useState(() => isAuthenticated());
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [isScanImportOpen, setIsScanImportOpen] = useState(false);

  useEffect(() => {
    function onUnauthorized() {
      setAuthenticated(false);
      setScreen({ name: "home" });
      setIsScanImportOpen(false);
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () =>
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  function handleAuthSuccess() {
    setAuthenticated(true);
    setScreen({ name: "home" });
  }

  function handleLogout() {
    clearAuth();
    setAuthenticated(false);
    setScreen({ name: "home" });
    setIsScanImportOpen(false);
  }

  async function persistEditorDocument(
    document: SavedDocument,
    meta?: { isAutosave?: boolean }
  ): Promise<SavedDocument> {
    try {
      if (!isAuthenticated()) {
        throw new Error("פג תוקף ההתחברות");
      }

      const isTemp = String(document.id).startsWith("temp-");

      /* autosave למסמך טיוטה (סריקה וכו'): לא יוצר רשומות כפולות ולא מחליף מסך — זה מה שהיה תוקע הקלדה */
      if (isTemp && meta?.isAutosave) {
        return document;
      }

      if (isTemp) {
        const saved = await createDocument(document);
        setScreen({ name: "editor", document: saved });
        return saved;
      }

      const saved = await updateDocument(document);
      /* אין setScreen — מניעת רינדור מחדש של העורך אחרי שמירת מסמך קיים */
      return saved;
    } catch (e) {
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  async function persistSaveAs(document: SavedDocument) {
    try {
      if (!isAuthenticated()) {
        throw new Error("פג תוקף ההתחברות");
      }
      const now = new Date().toISOString();
      const toCreate: SavedDocument = {
        ...document,
        id: `temp-${crypto.randomUUID()}`,
        createdAt: now,
        updatedAt: now,
        folder: document.folder ?? "general",
      };
      const saved = await createDocument(toCreate);
      setScreen({ name: "editor", document: saved });
    } catch (e) {
      if (isAuthenticated()) {
        alert(e instanceof Error ? e.message : "שגיאת שמירה");
      }
      throw e instanceof Error ? e : new Error(String(e));
    }
  }

  function handleCreateNew() {
    setScreen({
      name: "editor",
      document: createEmptyDocument(),
    });
  }

  async function handleOpenDocument(documentId: string | number) {
    try {
      const document = await getDocument(documentId);
      setScreen({ name: "editor", document });
    } catch (e) {
      alert(e instanceof Error ? e.message : "לא ניתן לפתוח את המסמך");
    }
  }

  if (!authenticated) {
    return <AuthPage onSuccess={handleAuthSuccess} />;
  }

  if (screen.name === "home") {
    return (
      <>
        <DocumentsHome
          onCreateNew={handleCreateNew}
          onImportFromScan={() => setIsScanImportOpen(true)}
          onOpenDocument={handleOpenDocument}
          onLogout={handleLogout}
        />
        {isScanImportOpen ? (
          <ScanImportDialog
            onClose={() => setIsScanImportOpen(false)}
            onImportComplete={(result) => {
              const now = new Date().toISOString();
              setIsScanImportOpen(false);
              if (result.warnings.length > 0) {
                console.info("[scan import warnings]", result.warnings);
              }
              setScreen({
                name: "editor",
                document: {
                  id: `temp-${crypto.randomUUID()}`,
                  title: result.title.trim() || "טיוטה מסריקה",
                  contentJson: result.contentJson,
                  createdAt: now,
                  updatedAt: now,
                  folder: "general",
                },
              });
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <LeybedikStudio
      key={String(screen.document.id)}
      document={screen.document}
      onBackToHome={() => setScreen({ name: "home" })}
      onSave={(doc, meta) => persistEditorDocument(doc, meta)}
      onSaveAs={(doc) => persistSaveAs(doc)}
    />
  );
}

export default App;
