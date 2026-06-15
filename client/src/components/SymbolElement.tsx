import type {
  PageJson,
  SymbolElement as SymbolElementType,
} from "../types/editorDocument";
import {
   getElementFrameStyle,
  startElementDrag,
  startElementResize,
  stopEditorEvent,
} from "./elementViewUtils";
const MIN_WIDTH = 20;
const MIN_HEIGHT = 20;

interface SymbolElementProps {
  page: PageJson;
  element: SymbolElementType;
  isSelected: boolean;
  lockVerticalDrag?: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onUpdate: (patch: Partial<SymbolElementType>) => void;
  onUpdateData: (updater: (element: SymbolElementType) => SymbolElementType) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}


export function SymbolElement({
  page,
  element,
  isSelected,
  lockVerticalDrag = false,
  onSelect,
  onMove,
  onResize,
  onDelete,
  onDuplicate,
}: SymbolElementProps) {
  return (
    <div
      className={`editor-element symbol-element ${
        isSelected ? "editor-element-selected" : ""
      }`}
      style={getElementFrameStyle(element)}
onMouseDown={(event) => {
  event.stopPropagation();
  onSelect();

  if (event.target instanceof HTMLElement) {
    if (
      event.target.closest("input") ||
      event.target.closest("textarea") ||
      event.target.closest("button")
    ) {
      return;
    }
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
    lockVerticalDrag,
    onMove,
  });
}}
    >
      <div className="symbol-content">{renderSymbol(element)}</div>

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

function renderSymbol(element: SymbolElementType) {
  const data = element.data;

  if (data.symbolType === "repeatEnd") {
    return (
      <div className="repeat-end-symbol" aria-label="סגירת חזרה">
        <div className="repeat-dots">
          <span />
          <span />
        </div>

        <div className="repeat-lines">
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (data.symbolType === "volta") {
  return (
    <div className="volta-symbol" aria-label="וולטה">
      {data.value ? <span className="volta-label">{data.value}</span> : null}
    </div>
  );
}

  if (data.symbolType === "fraction") {
  return (
    <div className="fraction-symbol" aria-label="שבר">
      <span className="fraction-number fraction-top">
        {data.numerator || "3"}
      </span>

      <span className="fraction-line" />

      <span className="fraction-number fraction-bottom">
        {data.denominator || "4"}
      </span>
    </div>
  );
}

  if (data.symbolType === "circleNumber") {
  return <div className="circle-number-symbol" aria-label="עיגול סביב מספר" />;
}
if (data.symbolType === "smallSharp") {
  return <div className="small-sharp-symbol" aria-label="דיאז קטן">#</div>;
}

  if (data.symbolType === "arrow") {
    return (
      <svg
        className="arrow-between-symbol"
        viewBox="0 0 48 28"
        aria-label="חץ בין שני מספרים"
      >
        <path
          d="M 8 20 C 13 6, 35 6, 40 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M 40 20 L 34 17 M 40 20 L 38 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (data.symbolType === "bracket") {
    return <div className="bracket-symbol">{"}"}</div>;
  }

  return <div className="unknown-symbol">?</div>;
}