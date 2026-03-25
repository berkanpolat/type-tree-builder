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

  const color =
    clampedValue >= 75
      ? "hsl(152, 69%, 41%)"
      : clampedValue >= 40
        ? "hsl(38, 92%, 50%)"
        : "hsl(var(--destructive))";

  const halfHeight = size / 2 + strokeWidth / 2;

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`} style={{ width: size, height: halfHeight }}>
      <svg
        width={size}
        height={halfHeight}
        viewBox={`0 0 ${size} ${halfHeight}`}
        style={{ overflow: "hidden" }}
      >
        {/* Background arc - full 180° */}
        <path
          d={describeArc(cx, cy, radius, 180, 360)}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
        />
        {/* Value arc */}
        {clampedValue > 0 && (
          <path
            d={describeArc(cx, cy, radius, 180, 180 + (clampedValue / 100) * 180)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            className="transition-all duration-500"
          />
        )}
      </svg>
      <span
        className="absolute font-bold text-foreground"
        style={{ bottom: 2, fontSize: size * 0.2 }}
      >
        %{clampedValue}
      </span>
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}
