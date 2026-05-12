// import type {
//   PageJson,
//   TabBlockElement as TabBlockElementType,
//   TabNote,
// } from "../types/editorDocument";
// import {
//   clamp,
//   getElementFrameStyle,
//   startElementDrag,
//   startElementResize,
//   stopEditorEvent,
// } from "./elementViewUtils";

// interface TabBlockElementProps {
//   page: PageJson;
//   element: TabBlockElementType;
//   isSelected: boolean;
//   onSelect: () => void;
//   onMove: (x: number, y: number) => void;
//   onResize: (width: number, height: number) => void;
//   onUpdate: (patch: Partial<TabBlockElementType>) => void;
//   onUpdateData: (updater: (element: TabBlockElementType) => TabBlockElementType) => void;
//   onDelete: () => void;
//   onDuplicate: () => void;
// }

// const MIN_WIDTH = 180;
// const MIN_HEIGHT = 120;
// const POSITION_STEP = 0.035;

// function createId(prefix: string): string {
//   if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
//     return `${prefix}-${crypto.randomUUID()}`;
//   }

//   return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
// }

// function updateNote(
//   notes: TabNote[],
//   noteId: string,
//   updater: (note: TabNote) => TabNote
// ): TabNote[] {
//   return notes.map((note) => (note.id === noteId ? updater(note) : note));
// }

// function shouldNotStartDrag(target: EventTarget | null): boolean {
//   if (!(target instanceof HTMLElement)) {
//     return false;
//   }

//   return Boolean(
//     target.closest("input") ||
//       target.closest("textarea") ||
//       target.closest("button") ||
//       target.closest(".tab-note-chip") ||
//       target.closest(".tab-note-actions")
//   );
// }

// export function TabBlockElement({
//   page,
//   element,
//   isSelected,
//   onSelect,
//   onMove,
//   onResize,
//   onUpdateData,
//   onDelete,
//   onDuplicate,
// }: TabBlockElementProps) {
//   const data = element.data;
//   const stringCount = Math.max(1, data.strings || 6);
//   const lineSpacing = Math.max(12, data.lineSpacing || 18);
//   const topPadding = 18;
//   const tabHeight = topPadding * 2 + (stringCount - 1) * lineSpacing;

//   function addNote() {
//     const note: TabNote = {
//       id: createId("tab-note"),
//       stringIndex: 0,
//       position: 0.2,
//       value: "0",
//     };

//     onUpdateData((current) => ({
//       ...current,
//       data: {
//         ...current.data,
//         notes: [...current.data.notes, note],
//       },
//     }));
//   }

//   function deleteNote(noteId: string) {
//     onUpdateData((current) => ({
//       ...current,
//       data: {
//         ...current.data,
//         notes: current.data.notes.filter((note) => note.id !== noteId),
//       },
//     }));
//   }

//   function updateNoteValue(noteId: string, value: string) {
//     onUpdateData((current) => ({
//       ...current,
//       data: {
//         ...current.data,
//         notes: updateNote(current.data.notes, noteId, (note) => ({
//           ...note,
//           value,
//         })),
//       },
//     }));
//   }

//   function moveNoteHorizontal(noteId: string, delta: number) {
//     onUpdateData((current) => ({
//       ...current,
//       data: {
//         ...current.data,
//         notes: updateNote(current.data.notes, noteId, (note) => ({
//           ...note,
//           position: clamp(note.position + delta, 0, 1),
//         })),
//       },
//     }));
//   }

//   function moveNoteVertical(noteId: string, delta: number) {
//     onUpdateData((current) => ({
//       ...current,
//       data: {
//         ...current.data,
//         notes: updateNote(current.data.notes, noteId, (note) => ({
//           ...note,
//           stringIndex: clamp(note.stringIndex + delta, 0, stringCount - 1),
//         })),
//       },
//     }));
//   }

//   return (
//     <div
//       className={`editor-element tab-block-element ${
//         isSelected ? "editor-element-selected" : ""
//       }`}
//       style={getElementFrameStyle(element)}
//       onMouseDown={(event) => {
//         event.stopPropagation();
//         onSelect();

//         if (shouldNotStartDrag(event.target)) {
//           return;
//         }

//         startElementDrag(event, {
//           page,
//           elementId: element.id,
//           startX: event.clientX,
//           startY: event.clientY,
//           elementX: element.x,
//           elementY: element.y,
//           elementWidth: element.width,
//           elementHeight: element.height,
//           onMove,
//         });
//       }}
//     >
//       <div className="tab-block-content" style={{ height: tabHeight }}>
//         {Array.from({ length: stringCount }).map((_, index) => (
//           <div
//             key={index}
//             className="tab-string-line"
//             style={{ top: topPadding + index * lineSpacing }}
//           />
//         ))}

//         {data.notes.map((note) => (
//           <div
//             key={note.id}
//             className="tab-note-chip"
//             style={{
//               left: `${note.position * 100}%`,
//               top: topPadding + note.stringIndex * lineSpacing,
//               fontSize: data.fontSize,
//             }}
//             onMouseDown={(event) => {
//               event.stopPropagation();
//               onSelect();
//             }}
//           >
//             <input
//               className="tab-note-input"
//               value={note.value}
//               onChange={(event) => updateNoteValue(note.id, event.target.value)}
//               onMouseDown={(event) => event.stopPropagation()}
//             />

//             {isSelected ? (
//               <span className="tab-note-actions">
//                 <button
//                   type="button"
//                   onMouseDown={stopEditorEvent}
//                   onClick={() => moveNoteHorizontal(note.id, -POSITION_STEP)}
//                 >
//                   ←
//                 </button>
//                 <button
//                   type="button"
//                   onMouseDown={stopEditorEvent}
//                   onClick={() => moveNoteHorizontal(note.id, POSITION_STEP)}
//                 >
//                   →
//                 </button>
//                 <button
//                   type="button"
//                   onMouseDown={stopEditorEvent}
//                   onClick={() => moveNoteVertical(note.id, -1)}
//                 >
//                   ↑
//                 </button>
//                 <button
//                   type="button"
//                   onMouseDown={stopEditorEvent}
//                   onClick={() => moveNoteVertical(note.id, 1)}
//                 >
//                   ↓
//                 </button>
//                 <button
//                   type="button"
//                   className="danger"
//                   onMouseDown={stopEditorEvent}
//                   onClick={() => deleteNote(note.id)}
//                 >
//                   ×
//                 </button>
//               </span>
//             ) : null}
//           </div>
//         ))}
//       </div>

//       {isSelected ? (
//         <div className="tab-block-inline-toolbar">
//           <button type="button" onMouseDown={stopEditorEvent} onClick={addNote}>
//             + מספר
//           </button>
//         </div>
//       ) : null}

//       {isSelected ? (
//         <div className="element-controls">
//           <button
//             type="button"
//             className="element-control-button"
//             onMouseDown={stopEditorEvent}
//             onClick={onDuplicate}
//           >
//             שכפל
//           </button>

//           <button
//             type="button"
//             className="element-control-button danger"
//             onMouseDown={stopEditorEvent}
//             onClick={onDelete}
//           >
//             מחק
//           </button>
//         </div>
//       ) : null}

//       {isSelected ? (
//         <button
//           type="button"
//           className="element-resize-handle"
//           aria-label="שינוי גודל"
//           onMouseDown={(event) => {
//             startElementResize(event, {
//               page,
//               startX: event.clientX,
//               startY: event.clientY,
//               startWidth: element.width,
//               startHeight: element.height,
//               elementX: element.x,
//               elementY: element.y,
//               minWidth: MIN_WIDTH,
//               minHeight: MIN_HEIGHT,
//               onResize,
//             });
//           }}
//         />
//       ) : null}
//     </div>
//   );
// }



import type { KeyboardEvent, MouseEvent } from "react";
import type { PageJson, TabBlockElement as TabBlockElementType } from "../types/editorDocument";
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
  const lines = data.lines?.length === 6 ? data.lines : DEFAULT_LINES;
  const tabNumber = data.tabNumber ?? "";

  function updateLine(lineIndex: number, value: string) {
    onUpdateData((current) => {
      const currentLines =
        current.data.lines?.length === 6 ? current.data.lines : DEFAULT_LINES;

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

{isSelected && !tabNumber ? (
  <button
    type="button"
    onMouseDown={stopEditorEvent}
    onClick={() => updateTabNumber("1")}
    style={{
      position: "absolute",
      top: -28,
      right: 4,
      zIndex: 20,
      height: 24,
      padding: "0 8px",
      border: "1px solid #cbd5e1",
      borderRadius: 6,
      background: "#ffffff",
      fontSize: 12,
      cursor: "pointer",
    }}
  >
    + מספר
  </button>
) : null}

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

  <div
    className="guitar-tab-main"
    style={{
      position: "absolute",
      left: 48,
      right: 0,
      top: 26,
      height: 120,
      borderLeft: "4px solid #111827",
      borderRight: "2px solid #111827",
    }}
  >
    {lines.map((line, index) => (
      <div
        className="guitar-tab-row"
        key={index}
        style={{
          position: "relative",
          height: 20,
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
            top: -14,
            width: "100%",
            height: 28,
            padding: "0 8px",
            background: "transparent",
            fontFamily: '"Courier New", monospace',
            fontSize: 24,
            fontWeight: 700,
            color: "#111827",
            direction: "ltr",
            textAlign: "left",
            letterSpacing: 4,
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