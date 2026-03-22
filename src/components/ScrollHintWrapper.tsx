import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";

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
      {/* Left shadow */}
      {showLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none bg-gradient-to-r from-background via-background/80 to-transparent" />
      )}

      {/* Scrollable content */}
      <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
        {children}
      </div>

      {/* Right shadow */}
      {showRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none bg-gradient-to-l from-background via-background/80 to-transparent" />
      )}
    </div>
  );
}
