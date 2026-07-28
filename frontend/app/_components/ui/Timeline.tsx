import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface TimelineStep {
  label: string;
  sublabel?: string;
  done: boolean;
  active: boolean;
}

// Vertical stepper. Completed steps get a filled check; the active step pulses;
// upcoming steps are muted. Used by the delivery tracking page.
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step.label} className="flex gap-3.5 pb-6 last:pb-0">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  step.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : step.active
                      ? "border-primary bg-card text-primary"
                      : "border-border bg-card text-muted-foreground",
                )}
              >
                {step.done ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      step.active ? "animate-pulse bg-primary" : "bg-border",
                    )}
                  />
                )}
              </span>
              {!last && (
                <span
                  className={cn(
                    "mt-1 w-0.5 flex-1",
                    step.done ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
            <div className="pt-0.5">
              <div
                className={cn(
                  "text-sm font-medium",
                  step.done || step.active
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {step.label}
              </div>
              {step.sublabel && (
                <div className="text-xs text-muted-foreground">
                  {step.sublabel}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
