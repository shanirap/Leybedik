export type EditorElementType = "textBox" | "songLine" | "tabBlock" | "symbol" | "image";

export interface EditorDocumentContent {
  version: number;
  pages: PageJson[];
  /** Legacy fields kept only so old saved documents can still be parsed safely. */
  blocks: EditorBlock[];
  elements?: EditorElement[];
}

export interface LegacyEditorDocumentContent {
  version?: number;
  pages?: PageJson[];
  blocks?: EditorBlock[];
  elements?: EditorElement[];
}

export interface PageJson {
  id: string;
  width: number;
  height: number;
  elements: EditorElement[];
}

export interface EditorBlock {
  id: string;
  type: string;
  text?: string;
  title?: string;
  chordName?: string;
  chordsTop?: string[];
  chordsBottom?: string[];
  elements?: EditorElement[];
}

export interface BaseElement {
  id: string;
  type: EditorElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked?: boolean;
}

export type TextBoxRole = "text" | "title";

export interface TextBoxElement extends BaseElement {
  type: "textBox";
  data: {
    role?: TextBoxRole;
    text: string;
    fontSize: number;
    fontFamily: string;
    color: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    textAlign: "right" | "center" | "left";
    direction: "rtl" | "ltr";
  };
}

export type ChordPlacement = "above" | "below";

export interface SongLineChord {
  id: string;
  text: string;
  position: number;
  placement: ChordPlacement;
  rowIndex?: number;
}

export interface SongLineMark {
  id: string;
  type: "sharp" | "circle";
  position: number;
  row?: "lyrics" | "above" | "below";
  value?: string;
  yOffset?: number;
}

export interface SongInlineMark {
  id: string;
  type: "circle";
  start: number;
  end: number;
}
export interface SongLineElement extends BaseElement {
  type: "songLine";
  data: {
    instrument?: "organ" | "guitar";
    lyrics: string;
    lyricsFontSize: number;
    lyricsFontFamily: string;
    lyricsColor: string;
    lyricsBold: boolean;
    lyricsAlign: "right" | "center" | "left";
    direction: "rtl" | "ltr";
    chords: SongLineChord[];
    marks?: SongLineMark[];
    inlineMarks?: SongInlineMark[];
    chordFontSize: number;
    chordColor: string;
    chordLines?: {
  aboveTop?: string;
  aboveBottom?: string;
  below?: string;
};
  };
}


export interface TabNote {
  id: string;
  stringIndex: number;
  position: number;
  value: string;
}
export interface TabRepeatMark {
  id: string;
  type: "repeatStart" | "repeatEnd";
  position: number;
}

export interface TabBlockElement extends BaseElement {
  type: "tabBlock";
  data: {
    strings: number;
    lineSpacing: number;
    notes: TabNote[]; // legacy
    fontSize: number;

    // New guitar tab model
    lines?: string[];
    tabNumber?: string;
    repeatMarks?: TabRepeatMark[];
  };
}

export type SymbolType =
  | "repeatEnd"
  | "volta"
  | "bracket"
  | "arrow"
  | "fraction"
  | "circleNumber"
  | "smallSharp";

export type AttachedSymbolRow = "lyrics" | "chordsTop";

export interface SymbolElementAttachment {
  songLineId: string;
  row: AttachedSymbolRow;
  offsetX: number;
  offsetY?: number;
}

export interface SymbolElement extends BaseElement {
  type: "symbol";
  data: {
    symbolType: SymbolType;
    value?: string;
    numerator?: string;
    denominator?: string;

    /**
     * If exists, this symbol is attached to a song line.
     * Its x/y on screen are calculated from the song line + offsetX/offsetY.
     */
    attachment?: SymbolElementAttachment;
  };
}
export interface ImageElementData {
  src: string;
  fileName?: string;
}

export interface ImageElement extends BaseElement {
  type: "image";
  data: ImageElementData;
}

export type EditorElement =
  | TextBoxElement
  | SongLineElement
  | TabBlockElement
  | SymbolElement
  | ImageElement;