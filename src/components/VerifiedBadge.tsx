import { CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerifiedBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export default function VerifiedBadge({ className = "", size = "sm" }: VerifiedBadgeProps) {
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center ${className}`}>
            <CheckCircle className={`${iconSize} text-emerald-500 fill-emerald-500/20`} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Onaylı Kullanıcı
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
