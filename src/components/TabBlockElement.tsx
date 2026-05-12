import { useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import type {
  PageJson,
  TabBlockElement as TabBlockElementType,
  TabRepeatMark,
} from "../types/editorDocument";
import {
  getElementFrameStyle,
  startElementDrag,
  startElementResize,
  stopEditorEvent,
} from "./elementViewUtils";

interface TabBlockElementProps {
  page: PageJson;
  element: TabBlockElementType;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onUpdate: (patch: Partial<TabBlockElementType>) => void;
  onUpdateData: (updater: (element: TabBlockElementType) => TabBlockElementType) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const MIN_WIDTH = 260;
const MIN_HEIGHT = 150;
const DEFAULT_LINES = ["", "", "", "", "", ""];
const REPEAT_POSITION_STEP = 0.01;

function shouldNotStartDrag(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest("input") ||
      target.closest("textarea") ||
      target.closest("button")
  );
}

function preventEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === "Enter") {
    event.preventDefault();
  }
}

function getInputFont(input: HTMLInputElement): string {
  const style = window.getComputedStyle(input);

  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

function getCharacterStepWidth(input: HTMLInputElement): number {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const style = window.getComputedStyle(input);

  const letterSpacing = Number.parseFloat(style.letterSpacing || "0") || 0;

  if (!context) {
    return 16 + letterSpacing;
  }

  context.font = getInputFont(input);

  const digitWidth = context.measureText("0").width || 16;

  return digitWidth + letterSpacing;
}
function getTargetIndexFromClick(input: HTMLInputElement, eventClientX: number): number {
  const rect = input.getBoundingClientRect();
  const style = window.getComputedStyle(input);

  const paddingLeft = Number.parseFloat(style.paddingLeft || "0");
  const paddingRight = Number.parseFloat(style.paddingRight || "0");

  const usableWidth = Math.max(1, rect.width - paddingLeft - paddingRight);
  const clickX = Math.max(
    0,
    Math.min(usableWidth, eventClientX - rect.left - paddingLeft)
  );

const characterStepWidth = getCharacterStepWidth(input);

return Math.max(0, Math.round(clickX / characterStepWidth));}
function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
export function TabBlockElement({
  page,
  element,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onUpdateData,
  onDelete,
  onDuplicate,
}: TabBlockElementProps) {
const data = element.data;
const isViolin = data.instrument === "violin";
const lineCount = isViolin ? 4 : 6;
const defaultLines = isViolin ? ["", "", "", ""] : DEFAULT_LINES;

const lines = data.lines?.length === lineCount ? data.lines : defaultLines;
const tabNumber = data.tabNumber ?? "";
const repeatMarks = data.repeatMarks ?? [];

const [selectedRepeatMarkId, setSelectedRepeatMarkId] = useState<string | null>(
  null
);
  function updateLine(lineIndex: number, value: string) {
    onUpdateData((current) => {
const currentIsViolin = current.data.instrument === "violin";
const currentLineCount = currentIsViolin ? 4 : 6;
const currentDefaultLines = currentIsViolin ? ["", "", "", ""] : DEFAULT_LINES;

const currentLines =
  current.data.lines?.length === currentLineCount
    ? current.data.lines
    : currentDefaultLines;

      return {
        ...current,
        data: {
          ...current.data,
          lines: currentLines.map((line, index) =>
            index === lineIndex ? value : line
          ),
        },
      };
    });
  }

  function updateTabNumber(value: string) {
    onUpdateData((current) => ({
      ...current,
      data: {
        ...current.data,
        tabNumber: value,
      },
    }));
  }
  function addRepeatMark(type: TabRepeatMark["type"]) {
  const mark: TabRepeatMark = {
    id: createId("tab-repeat"),
    type,
    position: type === "repeatStart" ? 0.08 : 0.92,
  };

  onUpdateData((current) => ({
    ...current,
    data: {
      ...current.data,
      repeatMarks: [...(current.data.repeatMarks ?? []), mark],
    },
  }));

  setSelectedRepeatMarkId(mark.id);
}

function deleteRepeatMark(markId: string) {
  onUpdateData((current) => ({
    ...current,
    data: {
      ...current.data,
      repeatMarks: (current.data.repeatMarks ?? []).filter(
        (mark) => mark.id !== markId
      ),
    },
  }));

  setSelectedRepeatMarkId(null);
}
function duplicateRepeatMark(markId: string) {
  let duplicatedId: string | null = null;

  onUpdateData((current) => {
    const marks = current.data.repeatMarks ?? [];
    const sourceMark = marks.find((mark) => mark.id === markId);

    if (!sourceMark) {
      return current;
    }

    const duplicatedMark: TabRepeatMark = {
      ...sourceMark,
      id: createId("tab-repeat"),
      position: Math.max(0, Math.min(1, sourceMark.position + 0.04)),
    };

    duplicatedId = duplicatedMark.id;

    return {
      ...current,
      data: {
        ...current.data,
        repeatMarks: [...marks, duplicatedMark],
      },
    };
  });

  if (duplicatedId) {
    setSelectedRepeatMarkId(duplicatedId);
  }
}
function moveRepeatMark(markId: string, delta: number) {
  onUpdateData((current) => ({
    ...current,
    data: {
      ...current.data,
      repeatMarks: (current.data.repeatMarks ?? []).map((mark) =>
        mark.id === markId
          ? {
              ...mark,
              position: Math.max(0, Math.min(1, mark.position + delta)),
            }
          : mark
      ),
    },
  }));
}

function handleRepeatMarkKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  markId: string
) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const direction = event.key === "ArrowLeft" ? -1 : 1;
  const multiplier = event.shiftKey ? 5 : 1;

  moveRepeatMark(markId, direction * REPEAT_POSITION_STEP * multiplier);
}

  function placeCaretInTabLine(
    event: MouseEvent<HTMLInputElement>,
    lineIndex: number
  ) {
    event.preventDefault();
    event.stopPropagation();
    onSelect();

    const input = event.currentTarget;
    const targetIndex = getTargetIndexFromClick(input, event.clientX);
    const currentValue = input.value;

    const nextValue =
      currentValue.length < targetIndex
        ? currentValue.padEnd(targetIndex, " ")
        : currentValue;

    if (nextValue !== currentValue) {
      updateLine(lineIndex, nextValue);
    }

    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(targetIndex, targetIndex);
    });
  }

  return (
    <div
      className={`editor-element tab-block-element guitar-tab-element ${
        
        isSelected ? "editor-element-selected" : ""
      }`}
      
      style={getElementFrameStyle(element)}
     onMouseDown={(event) => {
  event.stopPropagation();
  onSelect();

  if (event.target instanceof HTMLElement) {
    if (!event.target.closest(".tab-repeat-mark")) {
      setSelectedRepeatMarkId(null);
    }
  }

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
      
      <div
  className="guitar-tab-content"
  style={{
    position: "relative",
    width: "100%",
    height: "100%",
    minHeight: 150,
    direction: "ltr",
    overflow: "visible",
  }}
>
  
  {tabNumber ? (
  <div
    className="guitar-tab-number"
    style={{
      position: "absolute",
      top: -22,
      right: 4,
      width: 42,
      height: 42,
      border: "2px solid #111827",
      borderRadius: 999,
      background: "#ffffff",
      zIndex: 4,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <input
  value={tabNumber}
  aria-label="מספר טאב"
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
  onChange={(event) => {
    updateTabNumber(event.target.value);
  }}
  onKeyDown={preventEnter}
  style={{
    all: "unset",
    boxSizing: "border-box",
    width: 34,
    height: 34,
    textAlign: "center",
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    direction: "ltr",
    cursor: "text",
  }}
/>
  </div>
) : null}

{isSelected ? (
  <div className="song-line-inline-toolbar guitar-tab-inline-toolbar">
    {!tabNumber ? (
      <button
        type="button"
        onMouseDown={stopEditorEvent}
        onClick={() => updateTabNumber("1")}
      >
        + מספר
      </button>
    ) : null}

    <button
      type="button"
      onMouseDown={stopEditorEvent}
      onClick={() => addRepeatMark("repeatStart")}
    >
      + פתיחה
    </button>

    <button
      type="button"
      onMouseDown={stopEditorEvent}
      onClick={() => addRepeatMark("repeatEnd")}
    >
      + סגירה
    </button>
  </div>
) : null}

  {isViolin ? (
  <div
    className="violin-tab-clef"
    aria-hidden="true"
    style={{
      position: "absolute",
      left: 0,
      top: 22,
      width: 44,
      height: 90,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 54,
      lineHeight: 1,
      fontFamily: "serif",
      color: "#111827",
      zIndex: 2,
      pointerEvents: "none",
    }}
  >
    𝄞
  </div>
) : (
  <div
    className="guitar-tab-left-labels"
    aria-hidden="true"
    style={{
      position: "absolute",
      left: 0,
      top: 24,
      width: 50,
      height: 100,
      display: "grid",
      gridTemplateRows: "repeat(3, 32px)",
      alignItems: "center",
      justifyItems: "center",
      fontSize: 42,
      lineHeight: 1,
      fontWeight: 800,
      color: "#111827",
      zIndex: 2,
    }}
  >
    <span>T</span>
    <span>A</span>
    <span>B</span>
  </div>
)}

 <div
  className="guitar-tab-main"
  style={{
    position: "absolute",
    left: isViolin ? 44 : 48,
    right: 0,
    top: isViolin ? 34 : 26,
    height: isViolin ? 72 : 120,
    borderLeft: "4px solid #111827",
    borderRight: "2px solid #111827",
    overflow: "visible",
  }}
>
    {repeatMarks.map((mark) => {
  const isRepeatMarkSelected =
    isSelected && selectedRepeatMarkId === mark.id;

  const isStart = mark.type === "repeatStart";

  return (
    <div
      key={mark.id}
      className={`tab-repeat-mark ${
        isStart ? "tab-repeat-mark-start" : "tab-repeat-mark-end"
      } ${isRepeatMarkSelected ? "tab-repeat-mark-selected" : ""}`}
      tabIndex={0}
      style={{
        position: "absolute",
        left: `${mark.position * 100}%`,
        top: 0,
        height: isViolin ? 72 : 120,
        width: 22,
        transform: "translateX(-50%)",
        zIndex: 6,
        color: "#111827",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        pointerEvents: "auto",
        cursor: "pointer",
        outline: isRepeatMarkSelected ? "1px dashed #2563eb" : "none",
      }}
   onMouseDown={(event) => {
  event.preventDefault();
  event.stopPropagation();

  onSelect();
  setSelectedRepeatMarkId(mark.id);

  const target = event.currentTarget;

  requestAnimationFrame(() => {
    target.focus();
  });
}}
      onKeyDown={(event) => handleRepeatMarkKeyDown(event, mark.id)}
    >
     {isStart ? (
  <>
    <span
      style={{
        width: 4,
        height: "100%",
        background: "#111827",
        display: "block",
      }}
    />

    <span
      style={{
        width: 2,
        height: "100%",
        background: "#111827",
        display: "block",
        marginLeft: 3,
      }}
    />

    <span
      style={{
        position: "absolute",
        left: 16,
        top: isViolin ? 20 : 38,
        display: "flex",
        flexDirection: "column",
        gap: isViolin ? 10 : 18,
        zIndex: 31,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: "#111827",
          display: "block",
        }}
      />
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: "#111827",
          display: "block",
        }}
      />
    </span>
  </>
) : (
  <>
    <span
      style={{
        position: "absolute",
        right: 16,
        top: isViolin ? 20 : 38,
        display: "flex",
        flexDirection: "column",
        gap: isViolin ? 10 : 18,
        zIndex: 31,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: "#111827",
          display: "block",
        }}
      />
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: "#111827",
          display: "block",
        }}
      />
    </span>

    <span
      style={{
        width: 2,
        height: "100%",
        background: "#111827",
        display: "block",
        marginRight: 3,
      }}
    />

    <span
      style={{
        width: 4,
        height: "100%",
        background: "#111827",
        display: "block",
      }}
    />
  </>
)}

   {/* {isRepeatMarkSelected ? (
  <span
    className="element-controls tab-repeat-actions"
    style={{
      position: "absolute",
      top: -38,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 100,
      display: "flex",
      gap: 6,
      direction: "rtl",
      whiteSpace: "nowrap",
    }}
  >
    <button
      type="button"
      className="element-control-button"
      onMouseDown={stopEditorEvent}
      onClick={() => duplicateRepeatMark(mark.id)}
    >
      שכפל
    </button>

    <button
      type="button"
      className="element-control-button danger"
      onMouseDown={stopEditorEvent}
      onClick={() => deleteRepeatMark(mark.id)}
    >
      מחק
    </button>
  </span>
) : null} */}
{isRepeatMarkSelected ? (
  <span className="tab-repeat-actions">
    <button
      type="button"
      className="element-control-button"
      onMouseDown={stopEditorEvent}
      onClick={() => duplicateRepeatMark(mark.id)}
    >
      שכפל
    </button>

    <button
      type="button"
      className="element-control-button danger"
      onMouseDown={stopEditorEvent}
      onClick={() => deleteRepeatMark(mark.id)}
    >
      מחק
    </button>
  </span>
) : null}
    </div>
  );
})}
{isViolin ? (
  <>
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "33.333%",
        top: 0,
        width: 2,
        height: "100%",
        background: "#111827",
        zIndex: 1,
        pointerEvents: "none",
      }}
    />
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "66.666%",
        top: 0,
        width: 2,
        height: "100%",
        background: "#111827",
        zIndex: 1,
        pointerEvents: "none",
      }}
    />
  </>
) : null}

    {lines.map((line, index) => (
      <div
        className="guitar-tab-row"
        key={index}
        style={{
          position: "relative",
          height: isViolin ? 18 : 20,
          borderTop: "2px solid #111827",
          borderBottom: index === lines.length - 1 ? "2px solid #111827" : undefined,
          boxSizing: "border-box",
        }}
      >
        <input
          className="guitar-tab-line-input"
          value={line}
          dir="ltr"
          onMouseDown={(event) => placeCaretInTabLine(event, index)}
          onChange={(event) => updateLine(index, event.target.value)}
          onKeyDown={preventEnter}
          style={{
            all: "unset",
            boxSizing: "border-box",
            position: "absolute",
            left: 0,
            top: isViolin ? -13 : -14,
            width: "100%",
            height:  isViolin ? 26 : 28,
            padding: "0 8px",
            background: "transparent",
            fontFamily: '"Courier New", monospace',
            fontSize: isViolin ? 19 : 24,
            fontWeight: 700,
            color: "#111827",
            direction: "ltr",
            textAlign: "left",
            letterSpacing: isViolin ? 3 : 4,
            cursor: "text",
            zIndex: 2,
          }}
        />
      </div>
    ))}
  </div>
</div>

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