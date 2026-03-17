import { Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export default function VerifiedBadge({ className = "", size = "sm" }: VerifiedBadgeProps) {
  const outerSize = size === "sm" ? "w-5 h-5" : "w-6 h-6";
  const checkSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center justify-center ${outerSize} rounded-full bg-emerald-500 shrink-0 ${className}`}
          >
            <Check className={`${checkSize} text-white`} strokeWidth={3} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Onaylı Kullanıcı
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
