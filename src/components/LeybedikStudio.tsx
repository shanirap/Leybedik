import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DocumentFolder, SavedDocument } from "../types/savedDocument";
import { createFolder, getFolders } from "../api/foldersApi";
import type {
  EditorDocumentContent,
  EditorElement,
  PageJson,
  SongLineElement,
  SymbolElement,
  TabBlockElement,
  TextBoxElement,
} from "../types/editorDocument";
import {
  createEmptyEditorContent,
  normalizeEditorDocumentContent,
} from "../utils/normalizeEditorDocumentContent";
import { EditorCanvas } from "./EditorCanvas";
import { EditorToolbar } from "./EditorToolbar";
import { PropertiesPanel } from "./PropertiesPanel";
import "./LeybedikStudio.css";


interface SaveMeta {
  isAutosave?: boolean;
}

interface LeybedikStudioProps {
  currentDocument?: SavedDocument;
  document?: SavedDocument;
  onSaveDocument?: (
    document: SavedDocument,
    meta?: SaveMeta
  ) => Promise<unknown> | unknown;
  onSave?: (
    document: SavedDocument,
    meta?: SaveMeta
  ) => Promise<unknown> | unknown;
  onSaveAs?: (document: SavedDocument) => Promise<unknown> | unknown;
  onBackToDocuments?: () => void;
  onBackToHome?: () => void;
}

const DEFAULT_PAGE_ID = "page-1";
const TEXTBOX_MIN_WIDTH = 80;
const TEXTBOX_MIN_HEIGHT = 40;
const SONGLINE_HEIGHT = 92;
const SONGLINE_MIN_WIDTH = 180;
const TAB_BLOCK_MIN_WIDTH = 180;
const TAB_BLOCK_MIN_HEIGHT = 120;
const SONG_LINE_HEIGHT = 92;
const SONG_LINE_GAP = 10;
const A4_PAGE_WIDTH = 794;
const A4_PAGE_HEIGHT = 1123;

const PAGE_PADDING_X = 48;
const FIRST_SONG_LINE_Y = 80;
const SONG_LINE_WIDTH = A4_PAGE_WIDTH - PAGE_PADDING_X * 2;
const SONG_LINE_BOTTOM_LIMIT = A4_PAGE_HEIGHT - 70;
const TEMPLATE_LEFT = 40;
const TEMPLATE_WIDTH = 680;
const TAB_BLOCK_HEIGHT = 150;
const TEMPLATE_GAP = 12;
const FIRST_TEMPLATE_Y = 120;

function isTemplateElement(element: EditorElement): boolean {
  return element.type === "songLine" || element.type === "tabBlock";
}

function getTemplateElementHeight(element: EditorElement): number {
  if (element.type === "songLine") {
    return SONG_LINE_HEIGHT;
  }

  if (element.type === "tabBlock") {
    return TAB_BLOCK_HEIGHT;
  }

  return element.height;
}

function reorderTemplateElementByTargetY(
  page: PageJson,
  elementId: string,
  targetY: number
): PageJson {
  const templateElements = page.elements
    .filter(isTemplateElement)
    .sort((a, b) => a.y - b.y);

  const draggedElement = templateElements.find((element) => element.id === elementId);

  if (!draggedElement) {
    return page;
  }

  const otherTemplateElements = templateElements.filter(
    (element) => element.id !== elementId
  );

  let insertIndex = otherTemplateElements.findIndex((element) => {
    const elementMiddleY = element.y + getTemplateElementHeight(element) / 2;
    return targetY < elementMiddleY;
  });

  if (insertIndex === -1) {
    insertIndex = otherTemplateElements.length;
  }

  const nextTemplateElements = [
    ...otherTemplateElements.slice(0, insertIndex),
    draggedElement,
    ...otherTemplateElements.slice(insertIndex),
  ];

  let nextY = FIRST_TEMPLATE_Y;

  const repositionedTemplateElements = nextTemplateElements.map((element) => {
    const updatedElement = {
      ...element,
      x: TEMPLATE_LEFT,
      y: nextY,
      width: TEMPLATE_WIDTH,
      height: getTemplateElementHeight(element),
    };

    nextY += getTemplateElementHeight(element) + TEMPLATE_GAP;

    return updatedElement;
  });

  return {
    ...page,
    elements: page.elements.map((element) => {
      const updatedTemplateElement = repositionedTemplateElements.find(
        (item) => item.id === element.id
      );

      return updatedTemplateElement ?? element;
    }),
  };
}

const MAX_EMBEDDED_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_EMBEDDED_IMAGE_DIMENSION = 1400;
const EMBEDDED_IMAGE_QUALITY = 0.78;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("לא הצלחתי לקרוא את התמונה."));
        return;
      }

      resolve(result);
    };

    reader.onerror = () => {
      reject(new Error("לא הצלחתי לקרוא את התמונה."));
    };

    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("לא הצלחתי לטעון את התמונה."));

    image.src = src;
  });
}

async function compressImageFileToDataUrl(file: File): Promise<string> {
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageElement(originalDataUrl);

  const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale =
    largestSide > MAX_EMBEDDED_IMAGE_DIMENSION
      ? MAX_EMBEDDED_IMAGE_DIMENSION / largestSide
      : 1;

  const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("הדפדפן לא הצליח לעבד את התמונה.");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL("image/jpeg", EMBEDDED_IMAGE_QUALITY);
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
function shouldIgnoreKeyboardMove(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest("input") ||
      target.closest("textarea") ||
      target.closest("select") ||
      target.closest("button") ||
      target.closest("[contenteditable='true']")
  );
}
function getFirstPage(document: EditorDocumentContent): PageJson {
  return (
    document.pages[0] ?? {
      id: DEFAULT_PAGE_ID,
      width: 794,
      height: 1123,
      elements: [],
    }
  );
}

function getNextZIndex(document: EditorDocumentContent): number {
  let max = 0;

  document.pages.forEach((page) => {
    page.elements.forEach((element) => {
      max = Math.max(max, element.zIndex ?? 0);
    });
  });

  return max + 1;
}

function findElement(
  document: EditorDocumentContent,
  elementId: string | null
): { pageId: string; element: EditorElement } | null {
  if (!elementId) return null;

  for (const page of document.pages) {
      const element = page.elements.find((item) => item.id === elementId);
    if (element) {
      return { pageId: page.id, element };
    }
  }

  return null;
}

export function LeybedikStudio(props: LeybedikStudioProps) {
  const currentDocument = props.currentDocument ?? props.document;

  if (!currentDocument) {
    throw new Error("LeybedikStudio requires currentDocument or document");
  }
  const saveDocument =
    props.onSaveDocument ??
    props.onSave ??
    (async () => undefined);

  const onBackToDocuments = props.onBackToDocuments ?? props.onBackToHome;
  const [title, setTitle] = useState(currentDocument.title);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
 const [documentFolderId, setDocumentFolderId] = useState<number | null>(
  currentDocument.folderId ?? null
);  const [editorState, setEditorState] = useState<EditorDocumentContent>(() =>
    normalizeEditorDocumentContent(currentDocument.contentJson)
  );
  const [activePageId, setActivePageId] = useState(DEFAULT_PAGE_ID);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "dirty" | "saving" | "error">("saved");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(true);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const editorStateRef = useRef(editorState);
  const titleRef = useRef(title);
  const saveTimerRef = useRef<number | null>(null);
  const handleSaveRef = useRef<(isAutosave?: boolean) => Promise<void>>(
    async () => {}
  );
useEffect(() => {
  void getFolders()
    .then(setFolders)
    .catch(() => {
      setFolders([]);
    });
}, []);
  useEffect(() => {
    editorStateRef.current = editorState;
  }, [editorState]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  useEffect(() => {
  function handleKeyDown(event: KeyboardEvent) {
    if (!selectedElementId) {
      return;
    }

    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    const selectedElement = editorStateRef.current.pages
      .flatMap((page) => page.elements)
      .find((element) => element.id === selectedElementId);

    if (selectedElement?.type !== "symbol") {
      return;
    }

    if (!selectedElement.data.attachment) {
      return;
    }

    event.preventDefault();

    const step = event.shiftKey ? 8 : 2;
    const deltaX = event.key === "ArrowLeft" ? -step : step;

    moveAttachedSymbolHorizontally(selectedElement.id, deltaX);
  }

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [selectedElementId, moveAttachedSymbolHorizontally]);


  useEffect(() => {
    const normalized = normalizeEditorDocumentContent(currentDocument.contentJson);
    setEditorState(normalized);
    setTitle(currentDocument.title);
setDocumentFolderId(currentDocument.folderId ?? null);    setActivePageId(normalized.pages[0]?.id ?? DEFAULT_PAGE_ID);
    setSelectedElementId(null);
    setSaveStatus("saved");
    setSaveErrorMessage(null);
  }, [currentDocument.id, currentDocument.title, currentDocument.contentJson]);

  const selectedElementInfo = useMemo(
    () => findElement(editorState, selectedElementId),
    [editorState, selectedElementId]
  );

  const selectedElement = selectedElementInfo?.element ?? null;
async function handleSave(isAutosave = false) {
  const documentToSave = currentDocument;

  if (!documentToSave) {
    setSaveStatus("error");
    setSaveErrorMessage("לא נמצא מסמך לשמירה");
    return;
  }

  try {
    if (!isAutosave) {
      setSaveStatus("saving");
    }

    const contentJson = editorStateRef.current ?? createEmptyEditorContent();

    const now = new Date().toISOString();

    const nextDocument: SavedDocument = {
      ...documentToSave,
      id: documentToSave.id ?? createId("document"),
      title: titleRef.current || "מסמך ללא שם",
      contentJson,
      createdAt: documentToSave.createdAt ?? now,
      updatedAt: now,
      folderId: documentFolderId,
      folderName:
  folders.find((folder) => folder.id === documentFolderId)?.name ?? null,
    };

    await saveDocument(nextDocument, { isAutosave });

    setSaveStatus("saved");
    setSaveErrorMessage(null);
  } catch (error) {
    setSaveStatus("error");
    setSaveErrorMessage(error instanceof Error ? error.message : "שמירה נכשלה");
  }
}
  useEffect(() => {
    handleSaveRef.current = handleSave;
  });

  const markDirty = useCallback(() => {
    setSaveStatus("dirty");

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      void handleSaveRef.current(true);
    }, 900);
  }, []);
function isAttachedToSongLine(element: EditorElement, songLineId: string): boolean {
  return (
    element.type === "symbol" &&
    element.data.attachment?.songLineId === songLineId
  );
}

function getSongLineBundle(page: PageJson, songLineId: string): EditorElement[] {
  return page.elements.filter(
    (element) =>
      element.id === songLineId || isAttachedToSongLine(element, songLineId)
  );
}



  const updateDocumentState = useCallback(
    (updater: (current: EditorDocumentContent) => EditorDocumentContent) => {
      setEditorState((current) => {
        const next = updater(current);
        editorStateRef.current = next;
        return next;
      });

      markDirty();
    },
    [markDirty]
  );
const moveSelectedSongLineStackByKeyboard = useCallback(
  (deltaY: number) => {
    if (!selectedElementId) {
      return;
    }

    updateDocumentState((current) => ({
      ...current,
      pages: current.pages.map((page) => {
        const selectedElement = page.elements.find(
          (element) => element.id === selectedElementId
        );

        if (!selectedElement || selectedElement.type !== "songLine") {
          return page;
        }

        const selectedY = selectedElement.y;

        const templateElements = page.elements.filter(isTemplateElement);

        const movingElements = templateElements.filter(
          (element) => element.y >= selectedY
        );

        if (movingElements.length === 0) {
          return page;
        }

        const previousBottom = templateElements
          .filter((element) => element.y < selectedY)
          .reduce(
            (maxBottom, element) =>
              Math.max(
                maxBottom,
                element.y + getTemplateElementHeight(element)
              ),
            0
          );

        const minDelta =
          previousBottom > 0
            ? previousBottom + TEMPLATE_GAP - selectedY
            : -selectedY;

        const movingBottom = Math.max(
          ...movingElements.map(
            (element) => element.y + getTemplateElementHeight(element)
          )
        );

        const maxDelta = page.height - movingBottom;

        const safeDeltaY = clamp(deltaY, minDelta, maxDelta);

        if (safeDeltaY === 0) {
          return page;
        }

        return {
          ...page,
          elements: page.elements.map((element) => {
            if (!isTemplateElement(element)) {
              return element;
            }

            if (element.y < selectedY) {
              return element;
            }

            return {
              ...element,
              y: element.y + safeDeltaY,
            };
          }),
        };
      }),
    }));
  },
  [selectedElementId, updateDocumentState]
);

useEffect(() => {
  function handleKeyDown(event: KeyboardEvent) {
    if (shouldIgnoreKeyboardMove(event.target)) {
      return;
    }

    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }

    event.preventDefault();

    const step = event.shiftKey ? 10 : 1;

    moveSelectedSongLineStackByKeyboard(
      event.key === "ArrowUp" ? -step : step
    );
  }

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
}, [moveSelectedSongLineStackByKeyboard]);


  const updateElement = useCallback(
    (pageId: string, elementId: string, patch: Partial<EditorElement>) => {
      updateDocumentState((current) => ({
        ...current,
        pages: current.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                elements: page.elements.map((element) =>
                  element.id === elementId
                    ? ({ ...element, ...patch } as EditorElement)
                    : element
                ),
              }
            : page
        ),
      }));
    },
    [updateDocumentState]
  );


  const swapSongLines = useCallback(
  (firstSongLineId: string, secondSongLineId: string) => {
    if (firstSongLineId === secondSongLineId) {
      return;
    }

    updateDocumentState((current) => {
      let firstPage: PageJson | null = null;
      let secondPage: PageJson | null = null;
      let firstSongLine: SongLineElement | null = null;
      let secondSongLine: SongLineElement | null = null;

      for (const page of current.pages) {
        for (const element of page.elements) {
          if (element.id === firstSongLineId && element.type === "songLine") {
            firstPage = page;
            firstSongLine = element;
          }

          if (element.id === secondSongLineId && element.type === "songLine") {
            secondPage = page;
            secondSongLine = element;
          }
        }
      }

      if (!firstPage || !secondPage || !firstSongLine || !secondSongLine) {
        return current;
      }

      const firstBundle = getSongLineBundle(firstPage, firstSongLine.id);
      const secondBundle = getSongLineBundle(secondPage, secondSongLine.id);

      const firstTargetX = secondSongLine.x;
      const firstTargetY = secondSongLine.y;
      const firstTargetWidth = secondSongLine.width;
      const firstTargetHeight = secondSongLine.height;

      const secondTargetX = firstSongLine.x;
      const secondTargetY = firstSongLine.y;
      const secondTargetWidth = firstSongLine.width;
      const secondTargetHeight = firstSongLine.height;

      const firstBundleIds = new Set(firstBundle.map((element) => element.id));
      const secondBundleIds = new Set(secondBundle.map((element) => element.id));

      const movedFirstBundle = firstBundle.map((element) => {
        if (element.type !== "songLine") {
          return element;
        }

        return {
          ...element,
          x: firstTargetX,
          y: firstTargetY,
          width: firstTargetWidth,
          height: firstTargetHeight,
        };
      });

      const movedSecondBundle = secondBundle.map((element) => {
        if (element.type !== "songLine") {
          return element;
        }

        return {
          ...element,
          x: secondTargetX,
          y: secondTargetY,
          width: secondTargetWidth,
          height: secondTargetHeight,
        };
      });

      return {
        ...current,
        pages: current.pages.map((page) => {
          const withoutBothBundles = page.elements.filter(
            (element) =>
              !firstBundleIds.has(element.id) && !secondBundleIds.has(element.id)
          );

          if (page.id === firstPage!.id && page.id === secondPage!.id) {
            return {
              ...page,
              elements: [
                ...withoutBothBundles,
                ...movedFirstBundle,
                ...movedSecondBundle,
              ],
            };
          }

          if (page.id === firstPage!.id) {
            return {
              ...page,
              elements: [...withoutBothBundles, ...movedSecondBundle],
            };
          }

          if (page.id === secondPage!.id) {
            return {
              ...page,
              elements: [...withoutBothBundles, ...movedFirstBundle],
            };
          }

          return page;
        }),
      };
    });
  },
  [updateDocumentState]
);

const findSongLineIdAtPoint = useCallback(
  (clientX: number, clientY: number): string | null => {
    const nodes = window.document.elementsFromPoint(clientX, clientY);

    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) {
        continue;
      }

      const songLineNode = node.closest("[data-song-line-id]");

      if (songLineNode instanceof HTMLElement) {
        return songLineNode.dataset.songLineId ?? null;
      }
    }

    return null;
  },
  []
);
const handleImageFileSelected = useCallback(
  async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("אפשר להעלות קובץ תמונה בלבד.");
      return;
    }

    if (file.size > MAX_EMBEDDED_IMAGE_SIZE_BYTES) {
      alert("התמונה גדולה מדי. בחרי תמונה עד 8MB.");
      return;
    }

    try {
      const src = await compressImageFileToDataUrl(file);

      const pageId = activePageId ?? editorStateRef.current.pages[0]?.id;

      if (!pageId) {
        return;
      }

      const imageElement: EditorElement = {
        id: createId("image"),
        type: "image",
        x: 80,
        y: 100,
        width: 260,
        height: 180,
        zIndex: getNextZIndex(editorStateRef.current),
        data: {
          src,
          fileName: file.name,
        },
      };

      updateDocumentState((current) => ({
        ...current,
        pages: current.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                elements: [...page.elements, imageElement],
              }
            : page
        ),
      }));

      setActivePageId(pageId);
      setSelectedElementId(imageElement.id);
    } catch (error) {
      alert(error instanceof Error ? error.message : "טעינת התמונה נכשלה.");
    }
  },
  [activePageId, updateDocumentState]
);
const handleElementDrop = useCallback(
  (
    _sourcePageId: string,
    elementId: string,
    clientX: number,
    clientY: number
  ) => {
    const sourceInfo = findElement(editorStateRef.current, elementId);

    if (!sourceInfo || sourceInfo.element.type !== "songLine") {
      return;
    }

    const targetSongLineId = findSongLineIdAtPoint(clientX, clientY);

    if (!targetSongLineId || targetSongLineId === elementId) {
      return;
    }

    swapSongLines(elementId, targetSongLineId);
  },
  [findSongLineIdAtPoint, swapSongLines]
);
  const updateElementData = useCallback(
    <T extends EditorElement>(
      pageId: string,
      elementId: string,
      updater: (element: T) => T
    ) => {
      updateDocumentState((current) => ({
        ...current,
        pages: current.pages.map((page) =>
          page.id === pageId
            ? {
                ...page,
                elements: page.elements.map((element) =>
                  element.id === elementId ? updater(element as T) : element
                ),
              }
            : page
        ),
      }));
    },
    [updateDocumentState]
  );

  const addElement = useCallback(
    (element: EditorElement) => {
      const currentState = editorStateRef.current;
      const fallbackPageId = getFirstPage(currentState).id;
      const pageId = activePageId || fallbackPageId;

      updateDocumentState((current) => {
        const hasActivePage = current.pages.some((page) => page.id === pageId);

        return {
          ...current,
          pages: current.pages.map((page, index) =>
            page.id === pageId || (!hasActivePage && index === 0)
              ? { ...page, elements: [...page.elements, element] }
              : page
          ),
        };
      });

      setSelectedElementId(element.id);
    },
    [activePageId, updateDocumentState]
  );

  const addTextBox = useCallback(
    (role: "text" | "title" = "text") => {
      const zIndex = getNextZIndex(editorStateRef.current);

      const element: TextBoxElement = {
        id: createId(role === "title" ? "title" : "text"),
        type: "textBox",
        x: role === "title" ? 180 : 120,
        y: role === "title" ? 90 : 150,
        width: role === "title" ? 430 : 260,
        height: role === "title" ? 56 : 110,
        zIndex,
        data: {
          role,
          text: role === "title" ? "כותרת" : "טקסט חופשי",
          fontSize: role === "title" ? 30 : 18,
          fontFamily: "Arial",
          color: "#111111",
          bold: role === "title",
          italic: false,
          underline: role === "title",
          textAlign: role === "title" ? "center" : "right",
          direction: "rtl",
        },
      };

      addElement(element);
    },
    [addElement]
  );

  function getNextSongLinePlacement(page: PageJson): {
  pageId: string;
  x: number;
  y: number;
  shouldCreateNewPage: boolean;
} {
  const songLines = page.elements
    .filter((element) => element.type === "songLine")
    .sort((a, b) => a.y - b.y);

  const lastSongLine = songLines.at(-1);

  const nextY = lastSongLine
    ? lastSongLine.y + SONG_LINE_HEIGHT + SONG_LINE_GAP
    : FIRST_SONG_LINE_Y;

  const wouldOverflow = nextY + SONG_LINE_HEIGHT > SONG_LINE_BOTTOM_LIMIT;

  return {
    pageId: page.id,
    x: PAGE_PADDING_X,
    y: nextY,
    shouldCreateNewPage: wouldOverflow,
  };
}
const addGuitarSongLine = useCallback(() => {
  const pageId = activePageId;
  const page = editorStateRef.current.pages.find((p) => p.id === pageId);

  if (!page) {
    return;
  }

  const position = getNextTemplateElementPosition(page);

  const element: SongLineElement = {
    id: createId("guitar-song-line"),
    type: "songLine",
    x: position.x,
    y: position.y,
    width: TEMPLATE_WIDTH,
    height: SONG_LINE_HEIGHT,
    zIndex: getNextZIndex(editorStateRef.current),
    data: {
      instrument: "guitar",

      lyrics: "",
      lyricsFontSize: 22,
      lyricsFontFamily: "Arial",
      lyricsColor: "#111827",
      lyricsBold: false,
      lyricsAlign: "right",
      direction: "rtl",

      chords: [],
      chordFontSize: 18,
      chordColor: "#111827",
      chordLines: {
        aboveTop: "",
        aboveBottom: "",
        below: "",
      },
    },
  };

  updateDocumentState((current) => ({
    ...current,
    pages: current.pages.map((page) =>
      page.id === pageId
        ? {
            ...page,
            elements: [...page.elements, element],
          }
        : page
    ),
  }));

  setSelectedElementId(element.id);
}, [activePageId, updateDocumentState]);

const addSongLine = useCallback(() => {
  const state = editorStateRef.current;
  const activePage =
    state.pages.find((page) => page.id === activePageId) ?? state.pages[0];

  if (!activePage) {
    return;
  }

  const placement = getNextSongLinePlacement(activePage);

  const targetPageId = placement.shouldCreateNewPage
    ? createId("page")
    : activePage.id;

  const targetPage: PageJson = placement.shouldCreateNewPage
    ? {
        id: targetPageId,
        width: A4_PAGE_WIDTH,
        height: A4_PAGE_HEIGHT,
        elements: [],
      }
    : activePage;

  const newSongLineY = placement.shouldCreateNewPage
    ? FIRST_SONG_LINE_Y
    : placement.y;

  const element: SongLineElement = {
    id: createId("song-line"),
    type: "songLine",
    x: PAGE_PADDING_X,
    y: newSongLineY,
    width: SONG_LINE_WIDTH,
    height: SONG_LINE_HEIGHT,
    zIndex: getNextZIndex(state),
    data: {
      lyrics: "",
      lyricsFontSize: 22,
      lyricsFontFamily: "Arial",
      lyricsColor: "#111827",
      lyricsBold: false,
      lyricsAlign: "left",
      direction: "ltr",
      chords: [],
      chordFontSize: 16,
      chordColor: "#111827",
      chordLines: {
        aboveTop: "",
        aboveBottom: "",
        below: "",
      },
    },
  };

  updateDocumentState((current) => {
    const pageExists = current.pages.some((page) => page.id === targetPageId);

    return {
      ...current,
      pages: pageExists
        ? current.pages.map((page) =>
            page.id === targetPageId
              ? {
                  ...page,
                  elements: [...page.elements, element],
                }
              : page
          )
        : [
            ...current.pages,
            {
              ...targetPage,
              elements: [element],
            },
          ],
    };
  });

  setActivePageId(targetPageId);
  setSelectedElementId(element.id);
}, [activePageId, updateDocumentState]);
function getElementTemplateHeight(element: EditorElement): number {
  if (element.type === "songLine") {
    return 92;
  }

  if (element.type === "tabBlock") {
    return 150;
  }

  return element.height;
}

function getNextTemplateElementPosition(page: PageJson): { x: number; y: number } {
  const templateElements = page.elements
    .filter((element) => element.type === "songLine" || element.type === "tabBlock")
    .sort((a, b) => a.y - b.y);

  const lastElement = templateElements.at(-1);

  if (!lastElement) {
    return {
      x: TEMPLATE_LEFT,
      y: FIRST_TEMPLATE_Y,
    };
  }

  return {
    x: TEMPLATE_LEFT,
    y: lastElement.y + getElementTemplateHeight(lastElement) + TEMPLATE_GAP,
  };
}
const addTabBlock = useCallback(() => {
  const pageId = activePageId;
  const page = editorStateRef.current.pages.find((p) => p.id === pageId);

  if (!page) {
    return;
  }

  const position = getNextTemplateElementPosition(page);

  const element: TabBlockElement = {
    id: createId("tab-block"),
    type: "tabBlock",
    x: position.x,
    y: position.y,
    width: TEMPLATE_WIDTH,
    height: TAB_BLOCK_HEIGHT,
    zIndex: getNextZIndex(editorStateRef.current),
    data: {
      strings: 6,
      lineSpacing: 24,
      notes: [],
      fontSize: 24,
      lines: ["", "", "", "", "", ""],
      tabNumber: "",
      instrument: "guitar",
      repeatMarks: [],
      showMeasureLines: false,
    },
  };

  updateDocumentState((current) => ({
    ...current,
    pages: current.pages.map((page) =>
      page.id === pageId
        ? {
            ...page,
            elements: [...page.elements, element],
          }
        : page
    ),
  }));

  setSelectedElementId(element.id);
}, [activePageId, updateDocumentState]);

const addViolinTabBlock = useCallback(() => {
  const pageId = activePageId;
  const page = editorStateRef.current.pages.find((p) => p.id === pageId);

  if (!page) {
    return;
  }

  const position = getNextTemplateElementPosition(page);

  const element: TabBlockElement = {
    id: createId("violin-tab-block"),
    type: "tabBlock",
    x: position.x,
    y: position.y,
    width: TEMPLATE_WIDTH,
    height: 130,
    zIndex: getNextZIndex(editorStateRef.current),
    data: {
      instrument: "violin",
      strings: 4,
      lineSpacing: 18,
      notes: [],
      fontSize: 20,
      lines: ["", "", "", ""],
      tabNumber: "",
      repeatMarks: [],
      showMeasureLines: false,
    },
  };

  updateDocumentState((current) => ({
    ...current,
    pages: current.pages.map((page) =>
      page.id === pageId
        ? {
            ...page,
            elements: [...page.elements, element],
          }
        : page
    ),
  }));

  setSelectedElementId(element.id);
}, [activePageId, updateDocumentState]);


  const addRepeatEndSymbol = useCallback(() => {
    const zIndex = getNextZIndex(editorStateRef.current);

    const element: SymbolElement = {
      id: createId("repeat-end"),
      type: "symbol",
      x: 610,
      y: 170,
      width: 34,
      height: 52,
      zIndex,
      data: {
        symbolType: "repeatEnd",
      },
    };

    addElement(element);
  }, [addElement]);

  const addArrowSymbol = useCallback(() => {
  const zIndex = getNextZIndex(editorStateRef.current);

  const element: SymbolElement = {
    id: createId("arrow-between"),
    type: "symbol",
    x: 300,
    y: 220,
    width: 30,
    height: 18,
    zIndex,
    data: {
      symbolType: "arrow",
    },
  };

  addElement(element);
}, [addElement]);
const addCircleNumberSymbol = useCallback(() => {
  const zIndex = getNextZIndex(editorStateRef.current);

  const element: SymbolElement = {
    id: createId("circle-number"),
    type: "symbol",
    x: 340,
    y: 240,
    width: 26,
    height: 26,
    zIndex,
    data: {
      symbolType: "circleNumber",
    },
  };

  addElement(element);
}, [addElement]);

const addCircleNumberAtPosition = useCallback(
  (pageId: string, x: number, y: number, width = 20, height = 24) => {
    const zIndex = getNextZIndex(editorStateRef.current);

    const element: SymbolElement = {
      id: createId("circle-number"),
      type: "symbol",
      x,
      y,
      width,
      height,
      zIndex,
      data: {
        symbolType: "circleNumber",
      },
    };

    updateDocumentState((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              elements: [...page.elements, element],
            }
          : page
      ),
    }));

    setSelectedElementId(element.id);
  },
  [updateDocumentState]
);

const addAttachedArrowToSongLine = useCallback(
  (
    pageId: string,
    songLineId: string,
    offsetX = 60,
    offsetY = 6,
    width = 32,
    height = 20
  ) => {
    const zIndex = getNextZIndex(editorStateRef.current);

    const element: SymbolElement = {
      id: createId("arrow"),
      type: "symbol",
      x: 0,
      y: 0,
      width,
      height,
      zIndex,
      data: {
        symbolType: "arrow",
        attachment: {
          songLineId,
          row: "chordsTop",
          offsetX,
          offsetY,
        },
      },
    };

    updateDocumentState((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              elements: [...page.elements, element],
            }
          : page
      ),
    }));

    setSelectedElementId(element.id);
  },
  [updateDocumentState]
);
const addAttachedRepeatEndToSongLine = useCallback(
  (
    pageId: string,
    songLineId: string,
    offsetX = 540,
    offsetY = -10,
    width = 24,
    height = 48
  ) => {
    const zIndex = getNextZIndex(editorStateRef.current);

    const element: SymbolElement = {
      id: createId("repeat-end"),
      type: "symbol",
      x: 0,
      y: 0,
      width,
      height,
      zIndex,
      data: {
        symbolType: "repeatEnd",
        attachment: {
          songLineId,
          row: "lyrics",
          offsetX,
          offsetY,
        },
      },
    };

    updateDocumentState((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              elements: [...page.elements, element],
            }
          : page
      ),
    }));

    setSelectedElementId(element.id);
  },
  [updateDocumentState]
);
const addAttachedVoltaToSongLine = useCallback(
  (
    pageId: string,
    songLineId: string,
    offsetX = 20,
    offsetY = -18,
    width = 90,
    height = 28
  ) => {
    const zIndex = getNextZIndex(editorStateRef.current);

    const element: SymbolElement = {
      id: createId("volta"),
      type: "symbol",
      x: 0,
      y: 0,
      width,
      height,
      zIndex,
      data: {
        symbolType: "volta",
        value: "",
        attachment: {
          songLineId,
          row: "chordsTop",
          offsetX,
          offsetY,
        },
      },
    };

    updateDocumentState((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              elements: [...page.elements, element],
            }
          : page
      ),
    }));

    setSelectedElementId(element.id);
  },
  [updateDocumentState]
);
const addAttachedSmallSharpToSongLine = useCallback(
  (
    pageId: string,
    songLineId: string,
    offsetX: number,
    offsetY = -17,
    width = 12,
    height = 14
  ) => {
    const zIndex = getNextZIndex(editorStateRef.current);

    const element: SymbolElement = {
      id: createId("small-sharp"),
      type: "symbol",
      x: 0,
      y: 0,
      width,
      height,
      zIndex,
      data: {
        symbolType: "smallSharp",
        attachment: {
          songLineId,
          row: "lyrics",
          offsetX,
          offsetY,
        },
      },
    };

    updateDocumentState((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              elements: [...page.elements, element],
            }
          : page
      ),
    }));

    setSelectedElementId(element.id);
  },
  [updateDocumentState]
);

const addAttachedCircleNumberToSongLine = useCallback(
  (
    pageId: string,
    songLineId: string,
    offsetX: number,
    offsetY = 0,
    width = 20,
    height = 24
  ) => {
    const zIndex = getNextZIndex(editorStateRef.current);

    const element: SymbolElement = {
      id: createId("circle-number"),
      type: "symbol",
      x: 0,
      y: 0,
      width,
      height,
      zIndex,
      data: {
        symbolType: "circleNumber",
        attachment: {
          songLineId,
          row: "lyrics",
          offsetX,
          offsetY,
        },
      },
    };

    updateDocumentState((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === pageId
          ? {
              ...page,
              elements: [...page.elements, element],
            }
          : page
      ),
    }));

    setSelectedElementId(element.id);
  },
  [updateDocumentState]
);
const addFractionSymbol = useCallback(() => {
  const zIndex = getNextZIndex(editorStateRef.current);

  const element: SymbolElement = {
    id: createId("fraction"),
    type: "symbol",
    x: 360,
    y: 260,
    width: 24,
    height: 34,
    zIndex,
    data: {
      symbolType: "fraction",
      numerator: "3",
      denominator: "4",
    },
  };

  addElement(element);
}, [addElement]);

const addVoltaSymbol = useCallback(() => {
  const zIndex = getNextZIndex(editorStateRef.current);

  const element: SymbolElement = {
    id: createId("volta"),
    type: "symbol",
    x: 300,
    y: 280,
    width: 120,
    height: 34,
    zIndex,
    data: {
      symbolType: "volta",
      value: "",
    },
  };

  addElement(element);
}, [addElement]);

const deleteElement = useCallback(
  (pageId: string, elementId: string) => {
    updateDocumentState((current) => ({
      ...current,
      pages: current.pages.map((page) => {
        if (page.id !== pageId) {
          return page;
        }

        const elementToDelete = page.elements.find(
          (element) => element.id === elementId
        );

        if (!elementToDelete) {
          return page;
        }

        const shouldDeleteElement = (element: EditorElement) => {
          if (element.id === elementId) {
            return true;
          }

          if (
            elementToDelete.type === "songLine" &&
            element.type === "symbol" &&
            element.data.attachment?.songLineId === elementToDelete.id
          ) {
            return true;
          }

          return false;
        };

        return {
          ...page,
          elements: page.elements.filter(
            (element) => !shouldDeleteElement(element)
          ),
        };
      }),
    }));

    setSelectedElementId((currentSelectedId) =>
      currentSelectedId === elementId ? null : currentSelectedId
    );
  },
  [updateDocumentState]
);
  const duplicateElement = useCallback(
    (pageId: string, elementId: string) => {
      const page = editorStateRef.current.pages.find((item) => item.id === pageId);
      const element = page?.elements.find((item) => item.id === elementId);

      if (!page || !element) return;

      const duplicate = {
        ...element,
        id: createId(element.type),
        x: element.x + 20,
        y: element.y + 20,
        zIndex: getNextZIndex(editorStateRef.current),
      } as EditorElement;

      updateDocumentState((current) => ({
        ...current,
        pages: current.pages.map((item) =>
          item.id === pageId
            ? { ...item, elements: [...item.elements, duplicate] }
            : item
        ),
      }));

      setSelectedElementId(duplicate.id);
    },
    [updateDocumentState]
  );

function moveAttachedSymbolHorizontally(elementId: string, deltaX: number) {
  updateDocumentState((current) => ({
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      elements: page.elements.map((element) => {
        if (element.id !== elementId || element.type !== "symbol") {
          return element;
        }

        if (!element.data.attachment) {
          return element;
        }

        return {
          ...element,
          data: {
            ...element.data,
            attachment: {
              ...element.data.attachment,
              offsetX: element.data.attachment.offsetX + deltaX,
            },
          },
        };
      }),
    })),
  }));
}

  const moveElement = useCallback(
  (pageId: string, elementId: string, x: number, y: number) => {
    updateDocumentState((current) => ({
      ...current,
      pages: current.pages.map((page) => {
        if (page.id !== pageId) {
          return page;
        }

        const element = page.elements.find((item) => item.id === elementId);

        if (!element) {
          return page;
        }

       if (element.type === "songLine" || element.type === "tabBlock") {
  return reorderTemplateElementByTargetY(page, elementId, y);
}

        // שאר האלמנטים כן נשארים חופשיים:
        // תיבת טקסט, וולטה חופשית, חץ חופשי, עיגול חופשי וכו'
        return {
          ...page,
          elements: page.elements.map((item) =>
            item.id === elementId
              ? {
                  ...item,
                  x,
                  y,
                }
              : item
          ),
        };
      }),
    }));
  },
  [updateDocumentState]
);

  const resizeElement = useCallback(
    (pageId: string, elementId: string, width: number, height: number) => {
      const page = editorStateRef.current.pages.find((item) => item.id === pageId);
      const element = page?.elements.find((item) => item.id === elementId);

      if (!page || !element) return;

      let minWidth = TEXTBOX_MIN_WIDTH;
      let minHeight = TEXTBOX_MIN_HEIGHT;
      let nextHeight = height;

      if (element.type === "songLine") {
        minWidth = SONGLINE_MIN_WIDTH;
        minHeight = SONGLINE_HEIGHT;
        nextHeight = SONGLINE_HEIGHT;
      }

      if (element.type === "tabBlock") {
        minWidth = TAB_BLOCK_MIN_WIDTH;
        minHeight = TAB_BLOCK_MIN_HEIGHT;
      }

      const nextWidth = clamp(width, minWidth, page.width - element.x);
      nextHeight = clamp(nextHeight, minHeight, page.height - element.y);

      updateElement(pageId, elementId, {
        width: nextWidth,
        height: nextHeight,
      } as Partial<EditorElement>);
    },
    [updateElement]
  );

  const updateSelectedElementData = useCallback(
    <T extends EditorElement>(updater: (element: T) => T) => {
      if (!selectedElementInfo) return;

      updateElementData<T>(
        selectedElementInfo.pageId,
        selectedElementInfo.element.id,
        updater
      );
    },
    [selectedElementInfo, updateElementData]
  );

  const updateSelectedElement = useCallback(
    (patch: Partial<EditorElement>) => {
      if (!selectedElementInfo) return;

      updateElement(selectedElementInfo.pageId, selectedElementInfo.element.id, patch);
    },
    [selectedElementInfo, updateElement]
  );

  const bringSelectedToFront = useCallback(() => {
    if (!selectedElementInfo) return;

    updateElement(selectedElementInfo.pageId, selectedElementInfo.element.id, {
      zIndex: getNextZIndex(editorStateRef.current),
    } as Partial<EditorElement>);
  }, [selectedElementInfo, updateElement]);

  const addPage = useCallback(() => {
  const newPageId = createId("page");

  updateDocumentState((current) => ({
    ...current,
    pages: [
      ...current.pages,
      {
        id: newPageId,
        width: A4_PAGE_WIDTH,
        height: A4_PAGE_HEIGHT,
        elements: [],
      },
    ],
  }));

  setActivePageId(newPageId);
  setSelectedElementId(null);
}, [updateDocumentState]);

const addImage = useCallback(() => {
  imageInputRef.current?.click();
}, []);

  const handlePrint = useCallback(() => {
  setSelectedElementId(null);
  window.setTimeout(() => {
    window.print();
  }, 80);
}, []);
function handleBackToDocuments() {
const isTempDocument = currentDocument
  ? String(currentDocument.id).startsWith("temp-")
  : false;
  if (isTempDocument || saveStatus === "dirty" || saveStatus === "saving" || saveStatus === "error") {
    alert("יש שינויים שלא נשמרו. קודם צריך לשמור את המסמך.");
    return;
  }

  onBackToDocuments?.();
}







  return (
    <div className="leybedik-studio">
      <input
  ref={imageInputRef}
  type="file"
  accept="image/*"
  style={{ display: "none" }}
  onChange={(event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    handleImageFileSelected(file);
    event.target.value = "";
  }}
/>
      <header className="studio-topbar">
        <div className="studio-topbar-actions">
          {onBackToDocuments ? (
            <button className="studio-secondary-button" onClick={handleBackToDocuments}>
              חזרה למסמכים
            </button>
          ) : null}

          <input
            className="studio-title-input"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              markDirty();
            }}
            aria-label="שם המסמך"
          />
        </div>

        <div className="studio-save-status">
          {saveStatus === "saving" ? "שומר..." : null}
          {saveStatus === "saved" ? "נשמר" : null}
          {saveStatus === "dirty" ? "יש שינויים שלא נשמרו" : null}
          {saveStatus === "error" ? saveErrorMessage ?? "שגיאה בשמירה" : null}
<label className="studio-folder-select">
  <span>תיקייה</span>
  <select
  value={documentFolderId ?? ""}
  onChange={(event) => {
    const value = event.target.value;

    if (value === "__new__") {
      const name = window.prompt("שם תיקייה חדשה");

      if (!name?.trim()) {
        return;
      }

      void createFolder(name.trim()).then((folder) => {
        setFolders((current) => [...current, folder]);
        setDocumentFolderId(folder.id);
        setSaveStatus("dirty");
      });

      return;
    }

    setDocumentFolderId(value ? Number(value) : null);
    setSaveStatus("dirty");
  }}
>
  <option value="">ללא תיקייה</option>

  {folders.map((folder) => (
    <option key={folder.id} value={folder.id}>
      {folder.name}
    </option>
  ))}

  <option value="__new__">+ תיקייה חדשה</option>
</select>
</label>
          <button className="studio-primary-button" onClick={() => void handleSave(false)}>
            שמירה
          </button>
        </div>
      </header>

      <div
  className={`studio-layout ${
    isPropertiesPanelOpen
      ? "studio-layout-properties-open"
      : "studio-layout-properties-closed"
  }`}
>
        <EditorToolbar
          onAddTitle={() => addTextBox("title")}
          onAddTextBox={() => addTextBox("text")}
          onAddSongLine={addSongLine}
          onAddTabBlock={addTabBlock}
          onAddRepeatEnd={addRepeatEndSymbol}
          onAddArrow={addArrowSymbol}
          onAddCircleNumber={addCircleNumberSymbol}
          onAddFraction={addFractionSymbol}
          onAddVolta={addVoltaSymbol}
          onPrint={handlePrint}
          onAddPage={addPage}
          onAddGuitarSongLine={addGuitarSongLine}
          onAddImage={addImage}
          onAddViolinTabBlock={addViolinTabBlock}
        />

        <main className="studio-main">
          <EditorCanvas
            document={editorState}
            activePageId={activePageId}
            selectedElementId={selectedElementId}
            onActivatePage={setActivePageId}
            onSelectElement={setSelectedElementId}
            onMoveElement={moveElement}
            onResizeElement={resizeElement}
            onUpdateElement={updateElement}
            onUpdateElementData={updateElementData}
            onDeleteElement={deleteElement}
            onDuplicateElement={duplicateElement}
            onAddCircleNumberAtPosition={addCircleNumberAtPosition}
          onAddAttachedCircleNumberToSongLine={addAttachedCircleNumberToSongLine}
          onAddAttachedVoltaToSongLine={addAttachedVoltaToSongLine}
          onAddAttachedArrowToSongLine={addAttachedArrowToSongLine}
          onAddAttachedRepeatEndToSongLine={addAttachedRepeatEndToSongLine}
          onAddAttachedSmallSharpToSongLine={addAttachedSmallSharpToSongLine}
          onDropElement={handleElementDrop}
          />
        </main>

<aside
  className={`properties-panel-shell ${
    isPropertiesPanelOpen
      ? "properties-panel-shell-open"
      : "properties-panel-shell-closed"
  }`}
>
  <button
    type="button"
    className="properties-panel-toggle"
    onClick={() => setIsPropertiesPanelOpen((current) => !current)}
    aria-label={isPropertiesPanelOpen ? "סגירת מאפיינים" : "פתיחת מאפיינים"}
    title={isPropertiesPanelOpen ? "סגירת מאפיינים" : "פתיחת מאפיינים"}
  >
    {isPropertiesPanelOpen ? "‹" : "›"}
  </button>

  <div className="properties-panel-shell-content">
    <PropertiesPanel
          selectedElement={selectedElement}
          onUpdateElement={updateSelectedElement}
          onUpdateElementData={updateSelectedElementData}
          onDelete={() => {
            if (selectedElementInfo) {
              deleteElement(selectedElementInfo.pageId, selectedElementInfo.element.id);
            }
          }}
          onDuplicate={() => {
            if (selectedElementInfo) {
              duplicateElement(selectedElementInfo.pageId, selectedElementInfo.element.id);
            }
          }}
          onBringToFront={bringSelectedToFront}
        />
  </div>
</aside>
      </div>
    </div>
  );
}