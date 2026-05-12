import type {
  EditorDocumentContent,
  EditorElement,
} from "../types/editorDocument";
import { PageView } from "./PageView";

interface EditorCanvasProps {
  document: EditorDocumentContent;
  activePageId: string;
  selectedElementId: string | null;
  onActivatePage: (pageId: string) => void;
  onSelectElement: (elementId: string | null) => void;
  onMoveElement: (
    pageId: string,
    elementId: string,
    x: number,
    y: number
  ) => void;
  onResizeElement: (
    pageId: string,
    elementId: string,
    width: number,
    height: number
  ) => void;
  onUpdateElement: (
    pageId: string,
    elementId: string,
    patch: Partial<EditorElement>
  ) => void;
  onUpdateElementData: <T extends EditorElement>(
    pageId: string,
    elementId: string,
    updater: (element: T) => T
  ) => void;
  onDeleteElement: (pageId: string, elementId: string) => void;
  onDuplicateElement: (pageId: string, elementId: string) => void;
  onAddCircleNumberAtPosition: (
  pageId: string,
  x: number,
  y: number,
  size?: number
) => void;

onAddAttachedCircleNumberToSongLine: (
  pageId: string,
  songLineId: string,
  offsetX: number,
  offsetY?: number,
  width?: number,
  height?: number
) => void;
onAddAttachedVoltaToSongLine: (
  pageId: string,
  songLineId: string,
  offsetX?: number,
  offsetY?: number,
  width?: number,
  height?: number
) => void; 
onAddAttachedArrowToSongLine: (
  pageId: string,
  songLineId: string,
  offsetX?: number,
  offsetY?: number,
  width?: number,
  height?: number
) => void;
onAddAttachedRepeatEndToSongLine: (
  pageId: string,
  songLineId: string,
  offsetX?: number,
  offsetY?: number,
  width?: number,
  height?: number
) => void;
onAddAttachedSmallSharpToSongLine: (
  pageId: string,
  songLineId: string,
  offsetX: number,
  offsetY?: number,
  width?: number,
  height?: number
) => void;
onDropElement: (
  pageId: string,
  elementId: string,
  clientX: number,
  clientY: number
) => void;
}

export function EditorCanvas({
  document,
  activePageId,
  selectedElementId,
  onActivatePage,
  onSelectElement,
  onMoveElement,
  onResizeElement,
  onUpdateElement,
  onUpdateElementData,
  onDeleteElement,
  onDuplicateElement,
  onAddCircleNumberAtPosition,
  onAddAttachedCircleNumberToSongLine,
  onAddAttachedVoltaToSongLine,
  onAddAttachedArrowToSongLine,
  onAddAttachedRepeatEndToSongLine,
  onAddAttachedSmallSharpToSongLine,
  onDropElement,
}: EditorCanvasProps) {
  return (
    <div
      className="editor-canvas"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onSelectElement(null);
        }
      }}
    >
      {document.pages.map((page, index) => (
        <PageView
          key={page.id}
          page={page}
          pageIndex={index}
          isActive={page.id === activePageId}
          selectedElementId={selectedElementId}
          onActivatePage={onActivatePage}
          onSelectElement={onSelectElement}
          onMoveElement={onMoveElement}
          onResizeElement={onResizeElement}
          onUpdateElement={onUpdateElement}
          onUpdateElementData={onUpdateElementData}
          onDeleteElement={onDeleteElement}
          onDuplicateElement={onDuplicateElement}
          onAddCircleNumberAtPosition={onAddCircleNumberAtPosition}
          onAddAttachedCircleNumberToSongLine={onAddAttachedCircleNumberToSongLine}
          onAddAttachedVoltaToSongLine={onAddAttachedVoltaToSongLine}
          onAddAttachedArrowToSongLine={onAddAttachedArrowToSongLine}
          onAddAttachedRepeatEndToSongLine={onAddAttachedRepeatEndToSongLine}
          onAddAttachedSmallSharpToSongLine={onAddAttachedSmallSharpToSongLine}
          onDropElement={onDropElement}
        />
      ))}
    </div>
  );
}