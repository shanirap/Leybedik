import type { PageJson, ImageElement } from "../types/editorDocument";
import {
  getElementFrameStyle,
  startElementDrag,
  startElementResize,
  stopEditorEvent,
} from "./elementViewUtils";

interface ImageElementViewProps {
  page: PageJson;
  element: ImageElement;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const MIN_WIDTH = 40;
const MIN_HEIGHT = 40;

function shouldNotStartDrag(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("button"));
}

export function ImageElementView({
  page,
  element,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onDelete,
  onDuplicate,
}: ImageElementViewProps) {
  return (
    <div
      className={`editor-element image-element ${
        isSelected ? "editor-element-selected" : ""
      }`}
      style={{
        ...getElementFrameStyle(element),
        background: "transparent",
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        onSelect();

        if (shouldNotStartDrag(event.target)) {
          return;
        }

        startElementDrag(event, {
          page,
          elementId: element.id,
          startX: event.clientX,
          startY: event.clientY,
          elementX: element.x,
          elementY: element.y,
          elementWidth: element.width,
          elementHeight: element.height,
          onMove,
        });
      }}
    >
    <img
  src={element.data.src}
  alt={element.data.fileName ?? "תמונה"}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "contain",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />

      {isSelected ? (
        <div className="element-controls">
          <button
            type="button"
            className="element-control-button"
            onMouseDown={stopEditorEvent}
            onClick={onDuplicate}
          >
            שכפל
          </button>

          <button
            type="button"
            className="element-control-button danger"
            onMouseDown={stopEditorEvent}
            onClick={onDelete}
          >
            מחק
          </button>
        </div>
      ) : null}

      {isSelected ? (
        <button
          type="button"
          className="element-resize-handle"
          aria-label="שינוי גודל"
          onMouseDown={(event) => {
            startElementResize(event, {
              page,
              startX: event.clientX,
              startY: event.clientY,
              startWidth: element.width,
              startHeight: element.height,
              elementX: element.x,
              elementY: element.y,
              minWidth: MIN_WIDTH,
              minHeight: MIN_HEIGHT,
              onResize,
            });
          }}
        />
      ) : null}
    </div>
  );
}