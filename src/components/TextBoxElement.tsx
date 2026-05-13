import type { MouseEvent as ReactMouseEvent } from "react";
import type {
  PageJson,
  TextBoxElement as TextBoxElementType,
} from "../types/editorDocument";
import {
  getElementFrameStyle,
  startElementDrag,
  stopEditorEvent,
} from "./elementViewUtils";

interface TextBoxElementProps {
  page: PageJson;
  element: TextBoxElementType;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onUpdate: (patch: Partial<TextBoxElementType>) => void;
  onUpdateData: (updater: (element: TextBoxElementType) => TextBoxElementType) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const MIN_WIDTH = 80;
const MIN_HEIGHT = 40;

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const TEXT_BOX_RESIZE_DIRECTIONS: ResizeDirection[] = ["n","s","e","w","ne","nw","se","sw",];

export function TextBoxElement({
  page,
  element,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onUpdateData,
  onDelete,
  onDuplicate,
}: TextBoxElementProps) {
  const data = element.data;
function startTextBoxResize(
  event: ReactMouseEvent<HTMLButtonElement>,
  direction: ResizeDirection
) {
  event.preventDefault();
  event.stopPropagation();
  onSelect();

  const startClientX = event.clientX;
  const startClientY = event.clientY;
  const startElementX = element.x;
  const startElementY = element.y;
  const startWidth = element.width;
  const startHeight = element.height;

  function handleMouseMove(moveEvent: MouseEvent) {
    const deltaX = moveEvent.clientX - startClientX;
    const deltaY = moveEvent.clientY - startClientY;

    let nextX = startElementX;
    let nextY = startElementY;
    let nextWidth = startWidth;
    let nextHeight = startHeight;

    if (direction.includes("e")) {
      nextWidth = startWidth + deltaX;
    }

    if (direction.includes("s")) {
      nextHeight = startHeight + deltaY;
    }

    if (direction.includes("w")) {
      nextX = startElementX + deltaX;
      nextWidth = startWidth - deltaX;
    }

    if (direction.includes("n")) {
      nextY = startElementY + deltaY;
      nextHeight = startHeight - deltaY;
    }

    if (nextWidth < MIN_WIDTH) {
      if (direction.includes("w")) {
        nextX = startElementX + startWidth - MIN_WIDTH;
      }

      nextWidth = MIN_WIDTH;
    }

    if (nextHeight < MIN_HEIGHT) {
      if (direction.includes("n")) {
        nextY = startElementY + startHeight - MIN_HEIGHT;
      }

      nextHeight = MIN_HEIGHT;
    }

    if (nextX < 0) {
      nextWidth += nextX;
      nextX = 0;
    }

    if (nextY < 0) {
      nextHeight += nextY;
      nextY = 0;
    }

    if (nextX + nextWidth > page.width) {
      nextWidth = page.width - nextX;
    }

    if (nextY + nextHeight > page.height) {
      nextHeight = page.height - nextY;
    }

    nextWidth = Math.max(MIN_WIDTH, nextWidth);
    nextHeight = Math.max(MIN_HEIGHT, nextHeight);

    if (nextX !== element.x || nextY !== element.y) {
      onMove(nextX, nextY);
    }

    onResize(nextWidth, nextHeight);
  }

  function handleMouseUp() {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}
 return (
  <div
    className={`editor-element text-box-element ${
      isSelected ? "editor-element-selected" : ""
    } ${data.role === "title" ? "text-box-title" : ""}`}
    style={getElementFrameStyle(element)}
    onMouseDown={(event) => {
      event.stopPropagation();
      onSelect();

      const target = event.target as HTMLElement;

      if (
        target.closest("textarea") ||
        target.closest("input") ||
        target.closest("button")
      ) {
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
      {/* <div
        className="element-drag-surface"
        onMouseDown={(event) => {
          if (!isSelected) {
            onSelect();
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
      /> */}

      <textarea
        className="text-box-input"
        value={data.text}
        dir={data.direction}
        style={{
          fontSize: data.fontSize,
          fontFamily: data.fontFamily,
          color: data.color,
          fontWeight: data.bold ? 700 : 400,
          fontStyle: data.italic ? "italic" : "normal",
          textDecoration: data.underline ? "underline" : "none",
          textAlign: data.textAlign,
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onChange={(event) => {
          const nextText = event.target.value;

          onUpdateData((current) => ({
            ...current,
            data: {
              ...current.data,
              text: nextText,
            },
          }));
        }}
      />

      {isSelected ? (
        <div className="element-controls">
          <button
            type="button"
            className="element-control-button"
            onMouseDown={stopEditorEvent}
            onClick={onDuplicate}
            title="שכפול"
          >
            שכפל
          </button>

          <button
            type="button"
            className="element-control-button danger"
            onMouseDown={stopEditorEvent}
            onClick={onDelete}
            title="מחיקה"
          >
            מחק
          </button>
        </div>
      ) : null}

      {isSelected
  ? TEXT_BOX_RESIZE_DIRECTIONS.map((direction) => (
      <button
        key={direction}
        type="button"
        className={`text-box-resize-handle text-box-resize-handle-${direction}`}
        aria-label="שינוי גודל"
        onMouseDown={(event) => startTextBoxResize(event, direction)}
      />
    ))
  : null}
    </div>
  );
}