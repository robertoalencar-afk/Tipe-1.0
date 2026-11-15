type Point = { x: number; y: number };
export type PhotoZoom = { scale: number; x: number; y: number };
export const NO_ZOOM: PhotoZoom = { scale: 1, x: 0, y: 0 };
/** A pinch owns the gesture until all fingers lift, so it cannot become a story swipe. */
export class PhotoPinch {
  points = new Map<number, Point>();
  active = false;
  private start: {
    ids: [number, number];
    distance: number;
    midpoint: Point;
    center: Point;
    width: number;
    height: number;
  } | null = null;
  value = { ...NO_ZOOM };
  down(id: number, p: Point, rect: { left: number; top: number; width: number; height: number }) {
    this.points.set(id, p);
    if (this.points.size === 2 && !this.active) {
      const [a, b] = [...this.points.values()] as [Point, Point];
      this.start = {
        ids: [...this.points.keys()] as [number, number],
        distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
        midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        width: rect.width,
        height: rect.height,
      };
      this.active = true;
    }
    return this.active;
  }
  move(id: number, p: Point) {
    if (!this.points.has(id)) return this.value;
    this.points.set(id, p);
    if (!this.active || !this.start || this.points.size < 2) return this.value;
    const a = this.points.get(this.start.ids[0]);
    const b = this.points.get(this.start.ids[1]);
    if (!a || !b) return this.value;
    const scale = Math.min(4, Math.max(1, Math.hypot(b.x - a.x, b.y - a.y) / this.start.distance));
    const clamp = (v: number, size: number) =>
      Math.max((-size * (scale - 1)) / 2, Math.min((size * (scale - 1)) / 2, v)) || 0;
    this.value = {
      scale,
      x: clamp(
        (a.x + b.x) / 2 -
          this.start.center.x -
          scale * (this.start.midpoint.x - this.start.center.x),
        this.start.width,
      ),
      y: clamp(
        (a.y + b.y) / 2 -
          this.start.center.y -
          scale * (this.start.midpoint.y - this.start.center.y),
        this.start.height,
      ),
    };
    return this.value;
  }
  up(id: number) {
    const consumed = this.active;
    this.points.delete(id);
    if (!this.points.size) this.reset();
    return consumed;
  }
  reset() {
    this.points.clear();
    this.active = false;
    this.start = null;
    this.value = { ...NO_ZOOM };
  }
}
