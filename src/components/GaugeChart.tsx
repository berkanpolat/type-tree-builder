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
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (clampedValue / 100) * circumference;

  const color =
    clampedValue >= 75
      ? "hsl(152, 69%, 41%)"  // emerald-500
      : clampedValue >= 40
        ? "hsl(38, 92%, 50%)"  // amber-500
        : "hsl(var(--destructive))";

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`} style={{ width: size, height: size * 0.6 }}>
      <svg
        width={size}
        height={size * 0.6}
        viewBox={`0 0 ${size} ${size * 0.6}`}
        className="overflow-visible"
      >
        {/* Background arc */}
        <path
          d={describeArc(size / 2, size * 0.55, radius, 180, 360)}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={describeArc(size / 2, size * 0.55, radius, 180, 180 + (clampedValue / 100) * 180)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span
        className="absolute font-bold text-foreground"
        style={{ bottom: 0, fontSize: size * 0.22 }}
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
