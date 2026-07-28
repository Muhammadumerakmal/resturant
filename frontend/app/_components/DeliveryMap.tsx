"use client";

import { Bike, Home, Store } from "lucide-react";
import { DELIVERY_ROUTE, type RoutePoint } from "@repo/shared";

// Foodpanda-style route mock. Renders the shared DELIVERY_ROUTE polyline in a
// 0–100 SVG space with a restaurant marker (start), a destination pin (end), and
// the courier at the interpolated position. No external map/tiles.
export function DeliveryMap({
  courierPos,
  progress,
}: {
  courierPos: RoutePoint;
  progress: number;
}) {
  const pts = DELIVERY_ROUTE;
  const start = pts[0];
  const end = pts[pts.length - 1];
  const line = pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted/40">
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* subtle grid backdrop */}
        <defs>
          <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path
              d="M 8 0 L 0 0 0 8"
              fill="none"
              stroke="var(--border)"
              strokeWidth="0.3"
            />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#grid)" />

        {/* full route (dashed, muted) */}
        <polyline
          points={line}
          fill="none"
          stroke="var(--border)"
          strokeWidth="1.4"
          strokeDasharray="2 2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* traveled portion (solid, primary) */}
        <polyline
          points={traveledPoints(pts, progress)}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* destination + start dots (icons overlaid in HTML below) */}
        <circle cx={start.x} cy={start.y} r="2.4" fill="var(--primary)" />
        <circle
          cx={end.x}
          cy={end.y}
          r="2.4"
          fill="var(--card)"
          stroke="var(--primary)"
          strokeWidth="1"
        />

        {/* courier */}
        <circle
          cx={courierPos.x}
          cy={courierPos.y}
          r="3.6"
          fill="var(--primary)"
          opacity="0.2"
        >
          <animate
            attributeName="r"
            values="3.6;5;3.6"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </circle>
        <circle
          cx={courierPos.x}
          cy={courierPos.y}
          r="2.2"
          fill="var(--primary)"
        />
      </svg>

      {/* Marker labels positioned over the SVG using the same 0–100 coordinates. */}
      <MapIcon x={start.x} y={start.y} label="Restaurant">
        <Store className="h-3.5 w-3.5" />
      </MapIcon>
      <MapIcon x={end.x} y={end.y} label="You">
        <Home className="h-3.5 w-3.5" />
      </MapIcon>
      <div
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary p-1 text-primary-foreground shadow-md"
        style={{ left: `${courierPos.x}%`, top: `${courierPos.y}%` }}
      >
        <Bike className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

function MapIcon({
  x,
  y,
  label,
  children,
}: {
  x: number;
  y: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm">
        {children}
      </span>
      <span className="mt-0.5 rounded bg-card/80 px-1 text-[9px] font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// Points from start up to the courier's current progress, then the courier — so
// the solid "traveled" polyline ends exactly under the courier marker.
function traveledPoints(pts: readonly RoutePoint[], progress: number): string {
  const p = Math.max(0, Math.min(1, progress));
  const seg: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    seg.push(d);
    total += d;
  }
  let target = p * total;
  const out: RoutePoint[] = [pts[0]];
  for (let i = 0; i < seg.length; i++) {
    if (target >= seg[i]) {
      out.push(pts[i + 1]);
      target -= seg[i];
    } else {
      const t = seg[i] === 0 ? 0 : target / seg[i];
      out.push({
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * t,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * t,
      });
      break;
    }
  }
  return out.map((p) => `${p.x},${p.y}`).join(" ");
}
