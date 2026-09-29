export const CARD_GAP = 12;

export type HoverCardSide = 'below' | 'above';

export interface HoverCardAnchor {
  x: number;
  rowTop: number;
  rowBottom: number;
  side: HoverCardSide;
}

export interface HoverCardSize {
  width: number;
  height: number;
}

export interface HoverCardView {
  width: number;
  top: number;
  bottom: number;
}

export interface HoverCardPlacement {
  x: number;
  y: number;
  side: HoverCardSide;
}

export interface HoverCardRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface Point {
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const cross = (p: Point, q: Point, r: Point) =>
  (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);

export function preferredSide(
  band: { rowTop: number; rowBottom: number },
  plotHeight: number
): HoverCardSide {
  return (band.rowTop + band.rowBottom) / 2 < plotHeight / 2 ? 'above' : 'below';
}

export function placeHoverCard(
  anchor: HoverCardAnchor,
  card: HoverCardSize,
  view: HoverCardView
): HoverCardPlacement {
  const x = clamp(anchor.x - card.width / 2, 0, Math.max(view.width - card.width, 0));
  const below = anchor.rowBottom + CARD_GAP;
  const above = anchor.rowTop - CARD_GAP - card.height;
  const fitsBelow = below + card.height <= view.bottom;
  const fitsAbove = above >= view.top;
  const side: HoverCardSide =
    anchor.side === 'below'
      ? fitsBelow || !fitsAbove
        ? 'below'
        : 'above'
      : fitsAbove || !fitsBelow
        ? 'above'
        : 'below';
  const y =
    side === 'below'
      ? Math.min(below, Math.max(view.bottom - card.height, view.top))
      : Math.max(above, view.top);
  return { x, y, side };
}

export function isInsideApproach(anchor: HoverCardAnchor, card: HoverCardRect, point: Point) {
  const apex = { x: anchor.x, y: (anchor.rowTop + anchor.rowBottom) / 2 };
  let edge: [Point, Point] | undefined;
  if (card.bottom <= apex.y) {
    edge = [
      { x: card.left, y: card.bottom },
      { x: card.right, y: card.bottom },
    ];
  } else if (card.top >= apex.y) {
    edge = [
      { x: card.left, y: card.top },
      { x: card.right, y: card.top },
    ];
  } else if (card.left >= apex.x) {
    edge = [
      { x: card.left, y: card.top },
      { x: card.left, y: card.bottom },
    ];
  } else if (card.right <= apex.x) {
    edge = [
      { x: card.right, y: card.top },
      { x: card.right, y: card.bottom },
    ];
  }
  if (!edge) return false;
  const d1 = cross(apex, edge[0], point);
  const d2 = cross(edge[0], edge[1], point);
  const d3 = cross(edge[1], apex, point);
  const hasNegative = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPositive = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNegative && hasPositive);
}
