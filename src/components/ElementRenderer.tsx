import type {
  EditorElement,
  PageJson,
  SongLineElement as SongLineElementType,
  SymbolElement as SymbolElementType,
  TabBlockElement as TabBlockElementType,
  TextBoxElement as TextBoxElementType,
} from "../types/editorDocument";
import { SongLineElement } from "./SongLineElement";
import { SymbolElement } from "./SymbolElement";
import { TabBlockElement } from "./TabBlockElement";
import { TextBoxElement } from "./TextBoxElement";
import { getAttachedSymbolPosition } from "./attachedSymbolUtils";

interface ElementRendererProps {
  page: PageJson;
  element: EditorElement;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onUpdate: (patch: Partial<EditorElement>) => void;
  onUpdateData: <T extends EditorElement>(updater: (element: T) => T) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onAddCircleNumberAtPosition: (
  pageId: string,
  x: number,
  y: number,
  size?: number
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

export function ElementRenderer({
  page,
  element,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onUpdate,
  onUpdateData,
  onDelete,
  onDuplicate,
  onAddCircleNumberAtPosition,
  onAddAttachedCircleNumberToSongLine,
  onAddAttachedVoltaToSongLine,
  onAddAttachedArrowToSongLine,
  onAddAttachedRepeatEndToSongLine,
  onAddAttachedSmallSharpToSongLine,
  onDrop,
}: ElementRendererProps) {
  const commonProps = {
    page,
    isSelected,
    onSelect,
    onMove,
    onResize,
    onDelete,
    onDuplicate,
    onAddCircleNumberAtPosition,
    onAddAttachedCircleNumberToSongLine,
    onAddAttachedVoltaToSongLine,
    onAddAttachedArrowToSongLine,
    onAddAttachedRepeatEndToSongLine,
    onAddAttachedSmallSharpToSongLine,
    onDrop,
  };

  if (element.type === "textBox") {
    return (
      <TextBoxElement
        {...commonProps}
        element={element as TextBoxElementType}
        onUpdate={(patch) => onUpdate(patch as Partial<EditorElement>)}
        onUpdateData={(updater) => onUpdateData<TextBoxElementType>(updater)}
      />
    );
  }

  if (element.type === "songLine") {
    return (
      <SongLineElement
        {...commonProps}
        element={element as SongLineElementType}
        onUpdate={(patch) => onUpdate(patch as Partial<EditorElement>)}
        onUpdateData={(updater) => onUpdateData<SongLineElementType>(updater)}
        onAddCircleNumberAtPosition={onAddCircleNumberAtPosition}
        onAddAttachedCircleNumberToSongLine={onAddAttachedCircleNumberToSongLine}
        onAddAttachedVoltaToSongLine={onAddAttachedVoltaToSongLine}
        onAddAttachedArrowToSongLine={onAddAttachedArrowToSongLine}
onAddAttachedRepeatEndToSongLine={onAddAttachedRepeatEndToSongLine}      />
    );
  }

  if (element.type === "tabBlock") {
    return (
      <TabBlockElement
        {...commonProps}
        element={element as TabBlockElementType}
        onUpdate={(patch) => onUpdate(patch as Partial<EditorElement>)}
        onUpdateData={(updater) => onUpdateData<TabBlockElementType>(updater)}
      />
    );
  }

if (element.type === "symbol") {
  const symbolElement = element as SymbolElementType;
  const attachedPosition = getAttachedSymbolPosition(page, symbolElement);

  const positionedElement: SymbolElementType = {
    ...symbolElement,
    x: attachedPosition.x,
    y: attachedPosition.y,
  };

  return (
    <SymbolElement
      {...commonProps}
      element={positionedElement}
      onUpdate={(patch) => onUpdate(patch as Partial<EditorElement>)}
      onUpdateData={(updater) => onUpdateData<SymbolElementType>(updater)}
    />
  );
}

  return null;
}