export interface CardRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ViewportMetrics {
  width: number;
  height: number;
  offsetTop?: number;
  offsetLeft?: number;
}

const CARD_ASPECT = 10 / 7;

export function readViewportMetrics(): ViewportMetrics {
  if (typeof window === "undefined") {
    return { width: 1280, height: 800 };
  }

  const visual = window.visualViewport;
  return {
    width: visual?.width ?? window.innerWidth,
    height: visual?.height ?? window.innerHeight,
    offsetTop: visual?.offsetTop ?? 0,
    offsetLeft: visual?.offsetLeft ?? 0,
  };
}

export function getExpandedCardRect(metrics: ViewportMetrics): CardRect {
  const { width: viewportWidth, height: viewportHeight, offsetTop = 0, offsetLeft = 0 } = metrics;
  const isMobile = viewportWidth <= 640;
  const marginX = isMobile ? 12 : 24;
  const marginY = isMobile ? 12 : 24;

  const availableWidth = Math.max(1, viewportWidth - marginX * 2);
  const availableHeight = Math.max(1, viewportHeight - marginY * 2);

  const desktopWidthCap = 660;
  const desktopHeightCap = 880;

  let width = isMobile ? availableWidth : Math.min(desktopWidthCap, availableWidth);
  let height = width * CARD_ASPECT;

  const heightCap = isMobile ? availableHeight : Math.min(desktopHeightCap, availableHeight);
  if (height > heightCap) {
    height = heightCap;
    width = Math.min(isMobile ? availableWidth : desktopWidthCap, height / CARD_ASPECT);
  }

  return {
    top: offsetTop + marginY + Math.max(0, (viewportHeight - height) / 2),
    left: offsetLeft + marginX + Math.max(0, (viewportWidth - width) / 2),
    width,
    height,
  };
}

export function toCardRect(rect: DOMRect): CardRect {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

export interface FlashcardFitSnapshot {
  title?: number;
  body?: number;
}

export function readFitSnapshot(sourceEl: HTMLElement): FlashcardFitSnapshot {
  const readPx = (selector: string) => {
    const el = sourceEl.querySelector(selector);
    if (!el) return undefined;

    const px = Number.parseFloat(window.getComputedStyle(el).fontSize);
    return Number.isFinite(px) ? px : undefined;
  };

  return {
    title: readPx(".precision-flashcard__front-title"),
    body: readPx(".precision-flashcard__front-body"),
  };
}

export function scaleSnapshotFont(
  px: number,
  sourceRect: CardRect,
  currentRect: CardRect,
  minPx: number,
  maxPx: number
): number {
  if (sourceRect.height <= 0) return px;

  const scale = currentRect.height / sourceRect.height;
  return Math.min(maxPx, Math.max(minPx, Math.round(px * scale)));
}
