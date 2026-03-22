import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface ScrollHintWrapperProps {
  children: ReactNode;
  className?: string;
}

export default function ScrollHintWrapper({ children, className = "" }: ScrollHintWrapperProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showRight, setShowRight] = useState(false);
  const [showLeft, setShowLeft] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const tolerance = 4;
    setShowLeft(scrollLeft > tolerance);
    setShowRight(scrollLeft + clientWidth < scrollWidth - tolerance);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  return (
    <div className={`relative md:hidden ${className}`}>
      {/* Left fade */}
      {showLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      )}

      {/* Scrollable content */}
      <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
        {children}
      </div>

      {/* Right fade + arrow hint */}
      {showRight && (
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none flex items-center justify-end pr-1">
          <div className="w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center animate-pulse">
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}
