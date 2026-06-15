import type { SongLyricsStyleSpan } from "../types/editorDocument";

export type LyricsUnderlineStyle = "none" | "solid" | "dashed";

export interface LyricsRun {
  text: string;
  bold: boolean;
  underline: LyricsUnderlineStyle;
}

interface CharStyle {
  bold: boolean;
  underline: LyricsUnderlineStyle;
}

function defaultCharStyle(): CharStyle {
  return { bold: false, underline: "none" };
}

function compressStylesToSpans(styles: CharStyle[]): SongLyricsStyleSpan[] {
  if (styles.length === 0) {
    return [];
  }

  const spans: SongLyricsStyleSpan[] = [];
  let runStart = 0;
  let current = styles[0];

  function pushRun(end: number) {
    if (end <= runStart) {
      return;
    }

    if (!current.bold && current.underline === "none") {
      return;
    }

    spans.push({
      id: `span-${runStart}-${end}`,
      start: runStart,
      end,
      ...(current.bold ? { bold: true } : {}),
      ...(current.underline !== "none" ? { underline: current.underline } : {}),
    });
  }

  for (let index = 1; index < styles.length; index += 1) {
    const next = styles[index];

    if (next.bold === current.bold && next.underline === current.underline) {
      continue;
    }

    pushRun(index);
    runStart = index;
    current = next;
  }

  pushRun(styles.length);
  return spans;
}

function stylesFromSpans(
  textLength: number,
  spans: SongLyricsStyleSpan[]
): CharStyle[] {
  const styles = Array.from({ length: textLength }, defaultCharStyle);

  for (const span of spans) {
    const start = Math.max(0, span.start);
    const end = Math.min(textLength, span.end);

    for (let index = start; index < end; index += 1) {
      if (span.bold) {
        styles[index].bold = true;
      }

      if (span.underline) {
        styles[index].underline = span.underline;
      }
    }
  }

  return styles;
}

export function buildLyricsRuns(
  text: string,
  spans: SongLyricsStyleSpan[] | undefined
): LyricsRun[] {
  if (!text) {
    return [{ text: "", bold: false, underline: "none" }];
  }

  const styles = stylesFromSpans(text.length, spans ?? []);
  const runs: LyricsRun[] = [];
  let runStart = 0;
  let current = styles[0];

  function pushRun(end: number) {
    runs.push({
      text: text.slice(runStart, end),
      bold: current.bold,
      underline: current.underline,
    });
  }

  for (let index = 1; index < styles.length; index += 1) {
    const next = styles[index];

    if (next.bold === current.bold && next.underline === current.underline) {
      continue;
    }

    pushRun(index);
    runStart = index;
    current = next;
  }

  pushRun(text.length);
  return runs;
}

export function applyStyleToLyricsSelection(
  spans: SongLyricsStyleSpan[] | undefined,
  textLength: number,
  start: number,
  end: number,
  patch: {
    bold?: boolean;
    underline?: LyricsUnderlineStyle;
  }
): SongLyricsStyleSpan[] {
  const selectionStart = Math.max(0, Math.min(start, end));
  const selectionEnd = Math.min(textLength, Math.max(start, end));

  if (selectionStart >= selectionEnd) {
    return spans ?? [];
  }

  const styles = stylesFromSpans(textLength, spans ?? []);

  for (let index = selectionStart; index < selectionEnd; index += 1) {
    if (patch.bold !== undefined) {
      styles[index].bold = patch.bold;
    }

    if (patch.underline !== undefined) {
      styles[index].underline = patch.underline;
    }
  }

  return compressStylesToSpans(styles);
}

export function reconcileSpansOnTextChange(
  oldText: string,
  newText: string,
  spans: SongLyricsStyleSpan[] | undefined
): SongLyricsStyleSpan[] {
  const currentSpans = spans ?? [];

  if (oldText === newText) {
    return currentSpans;
  }

  let prefix = 0;
  const minLength = Math.min(oldText.length, newText.length);

  while (prefix < minLength && oldText[prefix] === newText[prefix]) {
    prefix += 1;
  }

  let oldSuffix = oldText.length;
  let newSuffix = newText.length;

  while (
    oldSuffix > prefix &&
    newSuffix > prefix &&
    oldText[oldSuffix - 1] === newText[newSuffix - 1]
  ) {
    oldSuffix -= 1;
    newSuffix -= 1;
  }

  const delta = newSuffix - oldSuffix;

  return currentSpans
    .map((span) => {
      if (span.end <= prefix) {
        if (delta > 0 && span.end >= oldSuffix && span.start < oldSuffix) {
          return {
            ...span,
            end: span.end + delta,
          };
        }

        return span;
      }

      if (span.start >= oldSuffix) {
        return {
          ...span,
          start: span.start + delta,
          end: span.end + delta,
        };
      }

      if (span.start >= prefix && span.end <= oldSuffix) {
        return null;
      }

      return null;
    })
    .filter(
      (span): span is SongLyricsStyleSpan =>
        span !== null && span.start < span.end && span.end <= newText.length
    );
}

export function hasLyricsStyleSpans(
  spans: SongLyricsStyleSpan[] | undefined
): boolean {
  return Boolean(spans?.length);
}
