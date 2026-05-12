import type {
  PageJson,
  TextBoxElement as TextBoxElementType,
} from "../types/editorDocument";
import {
  getElementFrameStyle,
  startElementDrag,
  startElementResize,
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