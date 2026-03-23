import { Skeleton } from "@/components/ui/skeleton";

/**
 * Full-page skeleton loader – replaces old "Yükleniyor..." text.
 * Renders a card-style skeleton that adapts to mobile / desktop.
 */
export function PageSkeleton() {
  return (
    <div className="w-full space-y-4 p-4 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      {/* Content cards */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

/** Inline skeleton for small sections / table cells */
export function InlineSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="w-full space-y-3 py-6 px-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

/** Table row skeleton */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <>
      {[1, 2, 3].map((row) => (
        <tr key={row}>
          {Array.from({ length: cols }).map((_, col) => (
            <td key={col} className="p-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Centered spinner – minimal loading indicator */
export function LoadingSpinner({ className = "h-64" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
