import type { DeliveryStage } from "./types";

// Shared delivery-tracking contract. The SAME route + interpolation math is used
// by the backend (to compute the courier's live position for `GET /:id/tracking`)
// and by the frontend `DeliveryMap` SVG, so server and client always agree.
//
// No external map/tile library: coordinates live in an abstract 0–100 square that
// the SVG renders directly (viewBox "0 0 100 100"). Point 0 = the restaurant,
// the final point = the delivery destination.

export interface RoutePoint {
  x: number;
  y: number;
}

// A gently winding path from the restaurant (bottom-left) to the customer
// (top-right). Foodpanda-style: a couple of turns rather than a straight line.
export const DELIVERY_ROUTE: readonly RoutePoint[] = [
  { x: 10, y: 86 }, // restaurant
  { x: 26, y: 74 },
  { x: 30, y: 52 },
  { x: 48, y: 46 },
  { x: 58, y: 30 },
  { x: 74, y: 26 },
  { x: 88, y: 14 }, // destination
];

// Position along DELIVERY_ROUTE at `progress` in [0, 1], by cumulative segment
// length so speed is uniform regardless of how points are spaced.
export function interpolateAlongRoute(progress: number): RoutePoint {
  const pts = DELIVERY_ROUTE;
  const p = Math.max(0, Math.min(1, progress));
  if (pts.length === 1 || p <= 0) return { ...pts[0] };
  if (p >= 1) return { ...pts[pts.length - 1] };

  const seg: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    seg.push(d);
    total += d;
  }

  let target = p * total;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) {
      const t = seg[i] === 0 ? 0 : target / seg[i];
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * t,
      };
    }
    target -= seg[i];
  }
  return { ...pts[pts.length - 1] };
}

// Live tracking snapshot returned by the tracking endpoint. camelCase to match
// the persisted `OrderWithItems` shape (not the snake_case agent DTO).
export interface TrackingTimelineStep {
  stage: DeliveryStage;
  label: string;
  done: boolean;
  active: boolean;
}

export interface TrackingState {
  orderId: string;
  orderType: string;
  stage: DeliveryStage;
  courierPos: RoutePoint;
  progress: number; // 0..1 along the route
  etaMinutes: number | null; // minutes remaining until delivery
  dispatchedAt: string | null;
  deliveredAt: string | null;
  address: string | null;
  customerName: string | null;
  timeline: TrackingTimelineStep[];
}

export const DELIVERY_STAGE_LABELS: Record<DeliveryStage, string> = {
  confirmed: "Order confirmed",
  preparing: "Preparing your food",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};
