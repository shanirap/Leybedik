import { useLayoutEffect, useRef,useState   } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import type {
  PageJson,
  SongLineElement as SongLineElementType,
} from "../types/editorDocument";
import {
  buildLyricsRuns,
  reconcileSpansOnTextChange,
} from "../utils/lyricsStyleSpans";
import {
  buildLyricsEditorFragment,
  getCharacterCenterRelativeTo,
  getClickedCharacterIndexInEditor,
  getLyricsCaretCenterRelativeTo,
  getSelectionOffsets,
  setSelectionOffsets,
} from "../utils/lyricsEditorUtils";
import {
  getElementFrameStyle,
  startElementDrag,
  startElementResize,
  stopEditorEvent,
} from "./elementViewUtils";
import { getChordLineFontSize } from "../utils/songLineChordUtils";
import {
  ATTACHED_LYRICS_ROW_Y,
  SONG_LINE_HEIGHT,
} from "../constants/songLineLayout";


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
onLyricsSelectionChange?: (start: number, end: number) => void;
}

const MIN_WIDTH = 180;

type ChordLineKey = "aboveTop" | "aboveBottom" | "below";

function shouldNotStartDrag(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest("input") ||
      target.closest("textarea") ||
      target.closest("[contenteditable='true']") ||
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
  onLyricsSelectionChange,
}: SongLineElementProps) {
const data = element.data;
const isGuitar = data.instrument === "guitar";
const direction = isGuitar ? "rtl" : data.direction;
const textAlign = isGuitar ? "right" : data.lyricsAlign;
const chordDirection = "ltr";
const chordTextAlign = "left";
const lyricsEditorRef = useRef<HTMLDivElement | null>(null);
const lastLyricsCaretRef = useRef(0);
const lastRenderedSpansKeyRef = useRef("");
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

  function syncLyricsSelection() {
    const editor = lyricsEditorRef.current;

    if (!editor) {
      return;
    }

    const { start, end } = getSelectionOffsets(editor);
    lastLyricsCaretRef.current = start;
    onLyricsSelectionChange?.(start, end);
  }

  function placeAttachedSmallSharpAtLastCaret() {
    const editor = lyricsEditorRef.current;

    if (!editor) {
      return;
    }

    const songLineElement = editor.closest(".song-line-element");

    if (!(songLineElement instanceof HTMLElement)) {
      return;
    }

    const center = getLyricsCaretCenterRelativeTo(
      editor,
      lastLyricsCaretRef.current,
      songLineElement
    );

    if (!center) {
      return;
    }

    const width = 11;
    const height = 13;

    onAddAttachedSmallSharpToSongLine(
      page.id,
      element.id,
      center.x - width / 2,
      center.y - ATTACHED_LYRICS_ROW_Y - height / 2,
      width,
      height
    );
  }

  function handleLyricsInput() {
    const editor = lyricsEditorRef.current;

    if (!editor) {
      return;
    }

    const lyrics = editor.textContent ?? "";

    if (lyrics === data.lyrics) {
      return;
    }

    updateLyrics(lyrics);
  }

  function updateLyrics(lyrics: string) {
    onUpdateData((current) => ({
      ...current,
      data: {
        ...current.data,
        lyrics,
        lyricsStyleSpans: reconcileSpansOnTextChange(
          current.data.lyrics,
          lyrics,
          current.data.lyricsStyleSpans
        ),
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

function openCircleMenuOnLyrics(event: MouseEvent<HTMLDivElement>) {
  event.preventDefault();
  event.stopPropagation();
  onSelect();

  const editor = event.currentTarget;
  const songLineElement = editor.closest(".song-line-element");

  if (!(songLineElement instanceof HTMLElement)) {
    return;
  }

  const charIndex = getClickedCharacterIndexInEditor(
    editor,
    event.clientX,
    event.clientY
  );

  if (charIndex === null) {
    return;
  }

  const center = getCharacterCenterRelativeTo(
    editor,
    charIndex,
    songLineElement
  );

  if (!center) {
    return;
  }

const circleWidth = 20;
const circleHeight = 24;

// Must match the lyrics row baseY in attachedSymbolUtils.ts
const lyricsBaseY = ATTACHED_LYRICS_ROW_Y;

setCircleMenu({
  screenX: event.clientX,
  screenY: event.clientY,
  offsetX: center.x - circleWidth / 2,
  offsetY: center.y - lyricsBaseY - circleHeight / 2,
  width: circleWidth,
  height: circleHeight,
});
}
const lyricsRuns = buildLyricsRuns(
  data.lyrics,
  data.lyricsStyleSpans
);
const lyricsBaseStyle = {
  fontSize: data.lyricsFontSize,
  fontFamily: data.lyricsFontFamily,
  color: data.lyricsColor,
  fontWeight: data.lyricsBold ? 700 : 400,
  textAlign,
} as const;

useLayoutEffect(() => {
  const editor = lyricsEditorRef.current;

  if (!editor) {
    return;
  }

  const spansKey = JSON.stringify(data.lyricsStyleSpans ?? []);

  if (lastRenderedSpansKeyRef.current === spansKey) {
    if (editor.textContent !== data.lyrics) {
      const selection = getSelectionOffsets(editor);
      editor.replaceChildren(buildLyricsEditorFragment(lyricsRuns));
      setSelectionOffsets(editor, selection);
    }

    return;
  }

  const selection = getSelectionOffsets(editor);
  editor.replaceChildren(buildLyricsEditorFragment(lyricsRuns));
  setSelectionOffsets(editor, selection);
  lastRenderedSpansKeyRef.current = spansKey;
}, [data.lyrics, data.lyricsStyleSpans, lyricsRuns]);

  return (
    <div
    data-song-line-id={element.id}
      className={`editor-element song-line-element ${
        isGuitar ? "song-line-element--guitar " : ""
      }${isSelected ? "editor-element-selected" : ""}`}
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
      <div
        className="song-line-content song-line-content-text-rows"
        dir={isGuitar ? "rtl" : "ltr"}
      >
        <input
          className="song-line-chord-text-row"
          value={chordLines.aboveTop ?? ""}
          placeholder="אקורדים"
          dir={chordDirection}
          style={{
            fontSize: getChordLineFontSize(data, "aboveTop"),
            fontFamily: data.chordFontFamily ?? data.lyricsFontFamily,
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
            fontSize: getChordLineFontSize(data, "aboveBottom"),
            fontFamily: data.chordFontFamily ?? data.lyricsFontFamily,
            color: data.chordColor,
          }}
          onMouseDown={(event) => placeCaretInChordLine(event, "aboveBottom")}
          onChange={(event) => updateChordLine("aboveBottom", event.target.value)}
          onKeyDown={preventEnter}
        />
): null}

        <div className="song-line-lyrics-row">
          <div
            ref={lyricsEditorRef}
            className="song-line-lyrics-input song-line-lyrics-editable"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-label="שורת שיר"
            data-placeholder="שורת שיר"
            dir={direction}
            style={lyricsBaseStyle}
            onMouseDown={(event) => {
              if (event.button === 0) {
                setCircleMenu(null);
              }
              event.stopPropagation();
              onSelect();
            }}
            onInput={handleLyricsInput}
            onMouseUp={syncLyricsSelection}
            onKeyUp={syncLyricsSelection}
            onFocus={syncLyricsSelection}
            onContextMenu={openCircleMenuOnLyrics}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
              }
            }}
          />
        </div>
{!isGuitar ? (

        <input
          className="song-line-chord-text-row"
          value={chordLines.below ?? ""}
          placeholder="אקורדים מתחת"
          dir="ltr"
          style={{
            fontSize: getChordLineFontSize(data, "below"),
            fontFamily: data.chordFontFamily ?? data.lyricsFontFamily,
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
            placeAttachedSmallSharpAtLastCaret();
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
          isGuitar ? 0 : 8,
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