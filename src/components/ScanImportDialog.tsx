import { useEffect, useState } from "react";
import type { EditorDocumentContent } from "../types/editorDocument";
import { importScan } from "../api/importsApi";
import "./ScanImportDialog.css";

export interface ScanImportCompleteResult {
  title: string;
  contentJson: EditorDocumentContent;
  warnings: string[];
}

interface Props {
  onClose: () => void;
  onImportComplete: (result: ScanImportCompleteResult) => void;
}

type Phase = "pick" | "loading" | "success" | "error";

export function ScanImportDialog({ onClose, onImportComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] =
    useState<ScanImportCompleteResult | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function isPdf(f: File) {
    return f.type === "application/pdf" || /\.pdf$/i.test(f.name);
  }

  function isImageFile(f: File) {
    return (
      f.type.startsWith("image/") ||
      /\.(png|jpe?g)$/i.test(f.name)
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    setErrorMessage(null);
    setSuccessResult(null);
    setPhase("pick");

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    setFile(next);

    if (next && isImageFile(next) && !isPdf(next)) {
      setPreviewUrl(URL.createObjectURL(next));
    }
  }

  async function handleRecognize() {
    if (!file) return;
    setErrorMessage(null);
    setPhase("loading");
    try {
      const result = await importScan(file);
      setSuccessResult(result);
      setPhase("success");
    } catch (e) {
      console.error("ScanImportDialog: זיהוי סריקה נכשל", e);
      setPhase("error");
      setErrorMessage(
        e instanceof Error ? e.message : "העיבוד נכשל. נסי שוב."
      );
    }
  }

  function handleOpenInEditor() {
    if (!successResult) return;
    onImportComplete(successResult);
  }

  function renderPreview() {
    if (!file) {
      return (
        <div className="scan-import-pdf-placeholder">לא נבחר קובץ</div>
      );
    }
    if (isPdf(file)) {
      return (
        <div className="scan-import-pdf-placeholder">
          קובץ PDF נבחר
          <div style={{ marginTop: 8, fontWeight: 400, fontSize: 13 }}>
            {file.name}
          </div>
        </div>
      );
    }
    if (previewUrl) {
      return (
        <img
          src={previewUrl}
          alt="תצוגה מקדימה"
          className="scan-import-preview-img"
        />
      );
    }
    return (
      <div className="scan-import-pdf-placeholder">{file.name}</div>
    );
  }

  const showPickUi = phase === "pick" || phase === "loading" || phase === "error";

  return (
    <div
      className="scan-import-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== "loading") onClose();
      }}
    >
      <div
        className="scan-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scan-import-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="scan-import-title">יצירת מסמך מסריקה</h2>
        <p className="scan-import-lead">
          העלי דף סרוק או צילום, והמערכת תיצור ממנו טיוטה לעריכה.
        </p>

        {showPickUi ? (
          <>
            <div className="scan-import-file-row">
              <input
                type="file"
                className="scan-import-file-input"
                accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
                onChange={handleFileChange}
                disabled={phase === "loading"}
              />
            </div>
            {file ? (
              <div className="scan-import-meta">
                {file.name} — {(file.size / 1024).toFixed(1)} KB
              </div>
            ) : null}

            <div className="scan-import-preview-wrap">{renderPreview()}</div>

            {errorMessage ? (
              <div className="scan-import-error" role="alert">
                {errorMessage}
              </div>
            ) : null}

            {phase === "loading" ? (
              <div className="scan-import-loading">מעבדת את הדף...</div>
            ) : null}

            <div className="scan-import-actions">
              <button
                type="button"
                className="scan-import-btn-primary"
                onClick={() => void handleRecognize()}
                disabled={!file || phase === "loading"}
              >
                זהה דף
              </button>
              <button
                type="button"
                className="scan-import-btn-secondary"
                onClick={onClose}
                disabled={phase === "loading"}
              >
                ביטול
              </button>
            </div>
          </>
        ) : null}

        {phase === "success" && successResult ? (
          <>
            <div className="scan-import-preview-wrap">{renderPreview()}</div>
            {successResult.warnings.length > 0 ? (
              <div className="scan-import-warnings">
                <strong>הערות זיהוי:</strong>
                <ul>
                  {successResult.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="scan-import-actions">
              <button
                type="button"
                className="scan-import-btn-primary"
                onClick={handleOpenInEditor}
              >
                פתיחה בעורך
              </button>
              <button
                type="button"
                className="scan-import-btn-secondary"
                onClick={onClose}
              >
                סגירה
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
