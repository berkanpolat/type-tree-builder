import { ShoppingCart, TrendingUp, Layers, FileText, Settings, Package, CheckCircle } from "lucide-react";

const STEP_ICONS = [ShoppingCart, TrendingUp, Layers, FileText, Settings, Package, CheckCircle];

interface Props {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  freeNavigation?: boolean;
}

export default function IhaleWizardStepper({ steps, currentStep, onStepClick, freeNavigation }: Props) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((label, i) => {
        const Icon = STEP_ICONS[i];
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        const isClickable = !!onStepClick && (freeNavigation || isDone || isActive);

        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center w-[90px]">
              <div
                onClick={() => isClickable && onStepClick?.(i)}
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                  isClickable ? "cursor-pointer" : ""
                } ${
                  isActive
                    ? "border-orange-500 bg-orange-500 text-white"
                    : isDone
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                onClick={() => isClickable && onStepClick?.(i)}
                className={`text-xs mt-2 text-center h-8 flex items-center justify-center leading-tight ${
                  isClickable ? "cursor-pointer" : ""
                } ${
                  isActive ? "text-orange-500 font-semibold" : isDone ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 mt-[-18px] ${isDone ? "bg-primary" : "bg-muted-foreground/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
