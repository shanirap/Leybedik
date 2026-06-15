import type { MouseEvent as ReactMouseEvent } from "react";
import type { PageJson } from "../types/editorDocument";

export interface DragOptions {
  page: PageJson;
  elementId: string;
  startX: number;
  startY: number;
  elementX: number;
  elementY: number;
  elementWidth: number;
  elementHeight: number;
  onMove: (x: number, y: number) => void;
  onDrop?: (clientX: number, clientY: number) => void;
  lockVerticalDrag?: boolean;
}

export interface ResizeOptions {
  page: PageJson;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  elementX: number;
  elementY: number;
  minWidth: number;
  minHeight: number;
  lockHeight?: boolean;
  onResize: (width: number, height: number) => void;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function stopEditorEvent(event: ReactMouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export function startElementDrag(event: ReactMouseEvent<HTMLElement>, options: DragOptions) {
  event.preventDefault();
  event.stopPropagation();

  const pointerStartX = event.clientX;
  const pointerStartY = event.clientY;

  function handleMouseMove(moveEvent: MouseEvent) {
    const deltaX = moveEvent.clientX - pointerStartX;
    const deltaY = moveEvent.clientY - pointerStartY;

    const nextX = clamp(
      options.elementX + deltaX,
      0,
      options.page.width - options.elementWidth
    );

    const nextY = options.lockVerticalDrag
      ? options.elementY
      : clamp(
          options.elementY + deltaY,
          0,
          options.page.height - options.elementHeight
        );

    options.onMove(nextX, nextY);
  }

 function handleMouseUp(upEvent: MouseEvent) {
  options.onDrop?.(upEvent.clientX, upEvent.clientY);

  window.removeEventListener("mousemove", handleMouseMove);
  window.removeEventListener("mouseup", handleMouseUp);
}

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
}

export function startElementResize(
  event: ReactMouseEvent<HTMLElement>,
  options: ResizeOptions
) {
  event.preventDefault();
  event.stopPropagation();

  const pointerStartX = event.clientX;
  const pointerStartY = event.clientY;

  function handleMouseMove(moveEvent: MouseEvent) {
    const deltaX = moveEvent.clientX - pointerStartX;
    const deltaY = moveEvent.clientY - pointerStartY;

    const maxWidth = options.page.width - options.elementX;
    const maxHeight = options.page.height - options.elementY;

    const nextWidth = clamp(options.startWidth + deltaX, options.minWidth, maxWidth);

    const nextHeight = options.lockHeight
      ? options.startHeight
      : clamp(options.startHeight + deltaY, options.minHeight, maxHeight);

    options.onResize(nextWidth, nextHeight);
  }

  function handleMouseUp() {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  }

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
}

export function getElementFrameStyle(params: {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}): React.CSSProperties {
  return {
    left: params.x,
    top: params.y,
    width: params.width,
    height: params.height,
    zIndex: params.zIndex,
  };
}