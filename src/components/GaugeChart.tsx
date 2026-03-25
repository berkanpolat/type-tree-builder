import React from "react";

interface GaugeChartProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function GaugeChart({ value, size = 64, strokeWidth = 6, className = "" }: GaugeChartProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const halfHeight = cy + strokeWidth / 2;

  const color =
    clampedValue >= 75
      ? "hsl(152, 69%, 41%)"
      : clampedValue >= 40
        ? "hsl(38, 92%, 50%)"
        : "hsl(var(--destructive))";

  // Arc from left (180°) to right (0°) = full semicircle
  const bgArc = makeArc(cx, cy, radius, Math.PI, 0);
  const valueEndAngle = Math.PI - (clampedValue / 100) * Math.PI;
  const valueArc = clampedValue > 0 ? makeArc(cx, cy, radius, Math.PI, valueEndAngle) : "";

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`} style={{ width: size, height: halfHeight }}>
      <svg width={size} height={halfHeight} viewBox={`0 0 ${size} ${halfHeight}`}>
        <path d={bgArc} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} strokeLinecap="butt" />
        {clampedValue > 0 && (
          <path d={valueArc} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="butt" className="transition-all duration-500" />
        )}
      </svg>
      <span className="absolute font-bold text-foreground" style={{ bottom: 2, fontSize: size * 0.2 }}>
        %{clampedValue}
      </span>
    </div>
  );
}

/** Build an SVG arc path from startAngle to endAngle (radians, 0 = right, PI = left, counterclockwise is negative y). */
function makeArc(cx: number, cy: number, r: number, startRad: number, endRad: number): string {
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy - r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy - r * Math.sin(endRad);
  // sweep-flag 1 = clockwise in SVG (which is our left-to-right upper semicircle)
  const diff = startRad - endRad;
  const largeArc = Math.abs(diff) > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}
