import { useRef,useState   } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import type {
  PageJson,
  SongLineElement as SongLineElementType,
} from "../types/editorDocument";
import {
  getElementFrameStyle,
  startElementDrag,
  startElementResize,
  stopEditorEvent,
} from "./elementViewUtils";


interface SongLineElementProps {
  page: PageJson;
  element: SongLineElementType;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onUpdate: (patch: Partial<SongLineElementType>) => void;
  onUpdateData: (updater: (element: SongLineElementType) => SongLineElementType) => void;
  onDelete: () => void;
  onDuplicate: () => void;
 onAddCircleNumberAtPosition: (
  pageId: string,
  x: number,
  y: number,
  width?: number,
  height?: number
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
onDrop?: (clientX: number, clientY: number) => void;
}

const SONG_LINE_HEIGHT = 92;
const MIN_WIDTH = 180;

type ChordLineKey = "aboveTop" | "aboveBottom" | "below";

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

export function SongLineElement({
  page,
  element,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onUpdateData,
  onDelete,
  onDuplicate,
  // onAddCircleNumberAtPosition,
  onAddAttachedCircleNumberToSongLine,
  onAddAttachedVoltaToSongLine,
  onAddAttachedArrowToSongLine,
  onAddAttachedRepeatEndToSongLine,
  onAddAttachedSmallSharpToSongLine,
  onDrop,
}: SongLineElementProps) {
const data = element.data;
const isGuitar = data.instrument === "guitar";
const direction = isGuitar ? "rtl" : data.direction;
const textAlign = isGuitar ? "right" : data.lyricsAlign;
const chordDirection = isGuitar ? "rtl" : "ltr";
const chordTextAlign = isGuitar ? "right" : "left";
const lyricsInputRef = useRef<HTMLInputElement | null>(null);
const [circleMenu, setCircleMenu] = useState<{
  screenX: number;
  screenY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
} | null>(null);

  const chordLines = data.chordLines ?? {
    aboveTop: "",
    aboveBottom: "",
    below: "",
  };

  function updateLyrics(lyrics: string) {
    onUpdateData((current) => ({
      ...current,
      data: {
        ...current.data,
        lyrics,
      },
    }));
  }

  function updateChordLine(line: ChordLineKey, value: string) {
    onUpdateData((current) => ({
      ...current,
      data: {
        ...current.data,
        chordLines: {
          ...(current.data.chordLines ?? {}),
          [line]: value,
        },
      },
    }));
  }

 function placeCaretInChordLine(
  event: MouseEvent<HTMLInputElement>,
  line: ChordLineKey
) {
  event.preventDefault();
  event.stopPropagation();
  onSelect();

  const input = event.currentTarget;
  const rect = input.getBoundingClientRect();
  const style = window.getComputedStyle(input);

  const paddingLeft = Number.parseFloat(style.paddingLeft || "0");
  const paddingRight = Number.parseFloat(style.paddingRight || "0");

  const usableWidth = Math.max(1, rect.width - paddingLeft - paddingRight);

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  let spaceWidth = 8;

  if (context) {
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    spaceWidth = context.measureText(" ").width || spaceWidth;
  }

  const isRtlInput = input.dir === "rtl" || style.direction === "rtl";

  const clickX = isRtlInput
    ? Math.max(
        0,
        Math.min(usableWidth, rect.right - paddingRight - event.clientX)
      )
    : Math.max(
        0,
        Math.min(usableWidth, event.clientX - rect.left - paddingLeft)
      );

  const targetIndex = Math.max(0, Math.round(clickX / spaceWidth));
  const currentValue = input.value;

  const nextValue =
    currentValue.length < targetIndex
      ? currentValue.padEnd(targetIndex, " ")
      : currentValue;

  if (nextValue !== currentValue) {
    updateChordLine(line, nextValue);
  }

  requestAnimationFrame(() => {
    input.focus();
    input.setSelectionRange(targetIndex, targetIndex);
  });
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

function measureTextWidth(input: HTMLInputElement, text: string): number {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return text.length * 10;
  }

  context.font = getInputFont(input);

  return context.measureText(text).width;
}

function getClickedCharacterIndex(
  input: HTMLInputElement,
  eventClientX: number
): number | null {
  const value = input.value;

  if (!value) {
    return null;
  }

  const rect = input.getBoundingClientRect();
  const style = window.getComputedStyle(input);

  const paddingLeft = Number.parseFloat(style.paddingLeft || "0");
  const paddingRight = Number.parseFloat(style.paddingRight || "0");

  const contentLeft = rect.left + paddingLeft;
  const contentRight = rect.right - paddingRight;

  const isRtl = input.dir === "rtl" || style.direction === "rtl";

  if (isRtl) {
    let cursorRight = contentRight;

    for (let index = 0; index < value.length; index += 1) {
      const char = value[index];
      const charWidth = measureTextWidth(input, char);
      const charLeft = cursorRight - charWidth;
      const charRight = cursorRight;

      if (eventClientX >= charLeft && eventClientX <= charRight) {
        return index;
      }

      cursorRight = charLeft;
    }

    return null;
  }

  let cursorLeft = contentLeft;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const charWidth = measureTextWidth(input, char);
    const charLeft = cursorLeft;
    const charRight = cursorLeft + charWidth;

    if (eventClientX >= charLeft && eventClientX <= charRight) {
      return index;
    }

    cursorLeft = charRight;
  }

  return null;
}
function getCharacterCenterInsideSongLine(
  input: HTMLInputElement,
  charIndex: number
): { x: number; y: number } {
  const inputRect = input.getBoundingClientRect();
  const elementNode = input.closest(".song-line-element");

  if (!(elementNode instanceof HTMLElement)) {
    return {
      x: element.width / 2,
      y: SONG_LINE_HEIGHT / 2,
    };
  }

  const elementRect = elementNode.getBoundingClientRect();
  const style = window.getComputedStyle(input);

  const paddingLeft = Number.parseFloat(style.paddingLeft || "0");
  const paddingRight = Number.parseFloat(style.paddingRight || "0");

  const value = input.value;
  const isRtl = input.dir === "rtl" || style.direction === "rtl";

  let charCenterXInInput = 0;

  if (isRtl) {
    let cursorRight = inputRect.width - paddingRight;

    for (let index = 0; index < value.length; index += 1) {
      const charWidth = measureTextWidth(input, value[index]);
      const charLeft = cursorRight - charWidth;

      if (index === charIndex) {
        charCenterXInInput = charLeft + charWidth / 2;
        break;
      }

      cursorRight = charLeft;
    }
  } else {
    let cursorLeft = paddingLeft;

    for (let index = 0; index < value.length; index += 1) {
      const charWidth = measureTextWidth(input, value[index]);
      const charLeft = cursorLeft;

      if (index === charIndex) {
        charCenterXInInput = charLeft + charWidth / 2;
        break;
      }

      cursorLeft += charWidth;
    }
  }

  const inputXInsideElement = inputRect.left - elementRect.left;
  const inputYInsideElement = inputRect.top - elementRect.top;

  return {
    x: inputXInsideElement + charCenterXInInput,
    y: inputYInsideElement + inputRect.height / 2,
  };
}
function openCircleMenuOnLyrics(event: MouseEvent<HTMLInputElement>) {
  event.preventDefault();
  event.stopPropagation();
  onSelect();

  const input = event.currentTarget;
  const charIndex = getClickedCharacterIndex(input, event.clientX);

  if (charIndex === null) {
    return;
  }

const center = getCharacterCenterInsideSongLine(input, charIndex);
const circleWidth = 20;
const circleHeight = 24;

// Must match the lyrics row baseY in attachedSymbolUtils.ts
const lyricsBaseY = 42;

setCircleMenu({
  screenX: event.clientX,
  screenY: event.clientY,
  offsetX: center.x - circleWidth / 2,
  offsetY: center.y - lyricsBaseY - circleHeight / 2,
  width: circleWidth,
  height: circleHeight,
});
}
  return (
    <div
    data-song-line-id={element.id}
      className={`editor-element song-line-element ${
        isSelected ? "editor-element-selected" : ""
      }`}
      style={{
        ...getElementFrameStyle({
          ...element,
          height: SONG_LINE_HEIGHT,
        }),
        height: SONG_LINE_HEIGHT,
      }}
      onMouseDown={(event) => {
        if (!(event.target instanceof HTMLElement)) {
    return;
  }

  if (!event.target.closest(".song-line-context-menu")) {
    setCircleMenu(null);
  }
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
  elementHeight: SONG_LINE_HEIGHT,
  onMove,
  onDrop,

});
      }}
    >
      <div className="song-line-content song-line-content-text-rows" dir="ltr">
        <input
          className="song-line-chord-text-row"
          value={chordLines.aboveTop ?? ""}
          placeholder="אקורדים"
          dir={chordDirection}
          style={{
            fontSize: data.chordFontSize,
            color: data.chordColor,
            textAlign: chordTextAlign,
    direction: chordDirection,
          }}
          onMouseDown={(event) => placeCaretInChordLine(event, "aboveTop")}
          onChange={(event) => updateChordLine("aboveTop", event.target.value)}
          onKeyDown={preventEnter}
        />
{!isGuitar ? (
        <input
          className="song-line-chord-text-row"
          value={chordLines.aboveBottom ?? ""}
          placeholder="אקורדים מעל"
          dir="ltr"
          style={{
            fontSize: data.chordFontSize,
            color: data.chordColor,
          }}
          onMouseDown={(event) => placeCaretInChordLine(event, "aboveBottom")}
          onChange={(event) => updateChordLine("aboveBottom", event.target.value)}
          onKeyDown={preventEnter}
        />
): null}

        <div className="song-line-lyrics-row">
          <input
            ref={lyricsInputRef}
            className="song-line-lyrics-input"
            value={data.lyrics}
            placeholder="שורת שיר"
            dir={direction}
            style={{
              fontSize: data.lyricsFontSize,
              fontFamily: data.lyricsFontFamily,
              color: data.lyricsColor,
              fontWeight: data.lyricsBold ? 700 : 400,
              textAlign,
            }}
            onMouseDown={(event) => {
              setCircleMenu(null);
              event.stopPropagation();
              onSelect();
            }}
            onContextMenu={openCircleMenuOnLyrics}
            onChange={(event) => updateLyrics(event.target.value)}
            onKeyDown={preventEnter}
          />
        </div>
{!isGuitar ? (

        <input
          className="song-line-chord-text-row"
          value={chordLines.below ?? ""}
          placeholder="אקורדים מתחת"
          dir="ltr"
          style={{
            fontSize: data.chordFontSize,
            color: data.chordColor,
          }}
          onMouseDown={(event) => placeCaretInChordLine(event, "below")}
          onChange={(event) => updateChordLine("below", event.target.value)}
          onKeyDown={preventEnter}
        />
        ) : null}
      </div>

   {isSelected ? (
  <div className="song-line-inline-toolbar">
    {!isGuitar ? (
      <>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();

            const input = lyricsInputRef.current;
            if (!input) {
              return;
            }

            const caretIndex = input.selectionStart ?? 0;
            const center = getCharacterCenterInsideSongLine(input, caretIndex);

            onAddAttachedSmallSharpToSongLine(
              page.id,
              element.id,
              center.x - 2,
              4,
              8,
              10
            );
          }}
        >
          + דיאז
        </button>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();

            onAddAttachedArrowToSongLine(
              page.id,
              element.id,
              60,
              10,
              32,
              20
            );
          }}
        >
          + חץ
        </button>

        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();

            onAddAttachedRepeatEndToSongLine(
              page.id,
              element.id,
              element.width - 28,
              -7,
              24,
              48
            );
          }}
        >
          + סגירה
        </button>
      </>
    ) : null}

    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();

        onAddAttachedVoltaToSongLine(
          page.id,
          element.id,
          20,
          isGuitar ? 0 : 18,
          90,
          28
        );
      }}
    >
      + וולטה
    </button>
  </div>
) : null}

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
          className="element-resize-handle horizontal-only"
          aria-label="שינוי רוחב"
          onMouseDown={(event) => {
            startElementResize(event, {
              page,
              startX: event.clientX,
              startY: event.clientY,
              startWidth: element.width,
              startHeight: SONG_LINE_HEIGHT,
              elementX: element.x,
              elementY: element.y,
              minWidth: MIN_WIDTH,
              minHeight: SONG_LINE_HEIGHT,
              lockHeight: true,
              onResize,
            });
          }}
        />
      ) : null}
{circleMenu ? (
  <div
    className="song-line-context-menu"
    style={{
      position: "fixed",
      left: circleMenu.screenX,
      top: circleMenu.screenY,
      zIndex: 99999,
    }}
    onMouseDown={(event) => {
      event.preventDefault();
      event.stopPropagation();
    }}
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
    }}
    onContextMenu={(event) => {
      event.preventDefault();
      event.stopPropagation();
    }}
  >
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();

onAddAttachedCircleNumberToSongLine(
  page.id,
  element.id,
  circleMenu.offsetX,
  circleMenu.offsetY,
  circleMenu.width,
  circleMenu.height
);

        setCircleMenu(null);
      }}
    >
      הוסף עיגול
    </button>
  </div>
) : null}
    </div>
  );
}