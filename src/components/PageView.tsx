import type {
  EditorElement,
  PageJson,
} from "../types/editorDocument";
import { ElementRenderer } from "./ElementRenderer";

interface PageViewProps {
  page: PageJson;
  pageIndex: number;
  isActive: boolean;
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

function PageFixedBlank() {
  return (
    <div className="page-fixed-blank" aria-hidden="true">
      <img
        className="page-fixed-blank-image"
        src="/assets/blank-page.png"
        alt=""
        draggable={false}
      />
    </div>
  );
}

export function PageView({
  page,
  pageIndex,
  isActive,
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
}: PageViewProps) {
  return (
    <section className="page-shell">
      <div className="page-label">עמוד {pageIndex + 1}</div>

      <div
        className={`editor-page ${isActive ? "editor-page-active" : ""}`}
        style={{
          width: page.width,
          height: page.height,
        }}
        onMouseDown={(event) => {
          onActivatePage(page.id);

          if (event.target === event.currentTarget) {
            onSelectElement(null);
          }
        }}
      >
        <PageFixedBlank />
        {page.elements.map((element) => (
          <ElementRenderer
            key={element.id}
            page={page}
            element={element}
            isSelected={selectedElementId === element.id}
            onSelect={() => {
              onActivatePage(page.id);
              onSelectElement(element.id);
            }}
            onMove={(x, y) => onMoveElement(page.id, element.id, x, y)}
            onResize={(width, height) =>
              onResizeElement(page.id, element.id, width, height)
            }
            onUpdate={(patch) => onUpdateElement(page.id, element.id, patch)}
            onUpdateData={(updater) =>
              onUpdateElementData(page.id, element.id, updater)
            }
            onDelete={() => onDeleteElement(page.id, element.id)}
            onDuplicate={() => onDuplicateElement(page.id, element.id)}
            onAddCircleNumberAtPosition={onAddCircleNumberAtPosition}
            onAddAttachedCircleNumberToSongLine={onAddAttachedCircleNumberToSongLine}
            onAddAttachedVoltaToSongLine={onAddAttachedVoltaToSongLine}
            onAddAttachedArrowToSongLine={onAddAttachedArrowToSongLine}
            onAddAttachedRepeatEndToSongLine={onAddAttachedRepeatEndToSongLine}
            onAddAttachedSmallSharpToSongLine={onAddAttachedSmallSharpToSongLine}
            onDrop={(clientX, clientY) => onDropElement(page.id, element.id, clientX, clientY)}
          />
        ))}
      </div>
    </section>
  );
}