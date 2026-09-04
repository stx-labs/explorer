import { CARD_GAP, isInsideApproach, placeHoverCard, preferredSide } from '../hoverCard';

const card = { width: 200, height: 120 };
const view = { width: 1000, top: 0, bottom: 500 };
const row = (top: number) => ({ rowTop: top, rowBottom: top + 28 });

describe('placeHoverCard', () => {
  it('centres the card on the pointer and rests it below the hovered row', () => {
    const placement = placeHoverCard({ x: 400, ...row(100), side: 'below' }, card, view);
    expect(placement).toEqual({ x: 300, y: 128 + CARD_GAP, side: 'below' });
  });

  it('keeps the card inside the plot horizontally', () => {
    expect(placeHoverCard({ x: 20, ...row(100), side: 'below' }, card, view).x).toBe(0);
    expect(placeHoverCard({ x: 990, ...row(100), side: 'below' }, card, view).x).toBe(800);
  });

  it('opens above the row when asked and there is room', () => {
    const placement = placeHoverCard({ x: 400, ...row(300), side: 'above' }, card, view);
    expect(placement).toEqual({ x: 300, y: 300 - CARD_GAP - card.height, side: 'above' });
  });

  it('may open past the top of the plot when the view allows it', () => {
    const tall = { width: 1000, top: -300, bottom: 500 };
    const placement = placeHoverCard({ x: 400, ...row(36), side: 'above' }, card, tall);
    expect(placement).toEqual({ x: 300, y: 36 - CARD_GAP - card.height, side: 'above' });
  });

  it('falls back to the other side only when the preferred one cannot fit', () => {
    expect(placeHoverCard({ x: 400, ...row(36), side: 'above' }, card, view)).toEqual({
      x: 300,
      y: 64 + CARD_GAP,
      side: 'below',
    });
    expect(placeHoverCard({ x: 400, ...row(440), side: 'below' }, card, view)).toEqual({
      x: 300,
      y: 440 - CARD_GAP - card.height,
      side: 'above',
    });
  });

  it('clamps to the view when the card fits on neither side', () => {
    const short = { width: 1000, top: 0, bottom: 100 };
    expect(placeHoverCard({ x: 400, ...row(36), side: 'below' }, card, short).y).toBe(0);
    expect(placeHoverCard({ x: 400, ...row(36), side: 'above' }, card, short).y).toBe(0);
  });
});

describe('preferredSide', () => {
  it('opens away from where the pointer is likely heading', () => {
    expect(preferredSide(row(36), 444)).toBe('above');
    expect(preferredSide(row(188), 444)).toBe('above');
    expect(preferredSide(row(226), 444)).toBe('below');
    expect(preferredSide(row(406), 444)).toBe('below');
  });
});

describe('isInsideApproach', () => {
  const anchor = { x: 400, ...row(300), side: 'below' as const };

  it('reaches a card opened above or below the row', () => {
    const above = { left: 300, right: 500, top: 130, bottom: 288 };
    expect(isInsideApproach(anchor, above, { x: 380, y: 296 })).toBe(true);
    expect(isInsideApproach(anchor, above, { x: 400, y: 340 })).toBe(false);
    const below = { left: 300, right: 500, top: 340, bottom: 500 };
    expect(isInsideApproach(anchor, below, { x: 430, y: 332 })).toBe(true);
    expect(isInsideApproach(anchor, below, { x: 400, y: 290 })).toBe(false);
  });

  it('covers the wedge to a card beside the pointer, not the column below it', () => {
    const beside = { left: 412, right: 612, top: 254, bottom: 374 };
    expect(isInsideApproach(anchor, beside, { x: 406, y: 330 })).toBe(true);
    expect(isInsideApproach(anchor, beside, { x: 400, y: 340 })).toBe(false);
    expect(isInsideApproach(anchor, beside, { x: 420, y: 314 })).toBe(false);
  });

  it('is never inside when the card overlaps the pointer', () => {
    expect(
      isInsideApproach(anchor, { left: 300, right: 500, top: 254, bottom: 374 }, { x: 400, y: 314 })
    ).toBe(false);
  });
});
