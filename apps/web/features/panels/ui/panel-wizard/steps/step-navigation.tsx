import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

type Step = {
  value: string;
  title: string;
};

type StepNavigationProps = {
  steps: Step[];
  currentStep: string;
  onStepChange: (step: string) => void;
  mode: "create" | "edit";
};

export default function StepNavigation({
  steps,
  currentStep,
  onStepChange,
  mode,
}: StepNavigationProps) {
  const getCurrentStepIndex = () => {
    return steps.findIndex((step) => step.value === currentStep);
  };

  return (
    <div className="nice-gray-border col-span-2 h-full bg-white p-4">
      <div className="mb-3">
        <h2 className="text-xs tracking-wide text-[#99A0AE]">
          {mode === "create" ? "CREATE PANEL" : "EDIT PANEL"}
        </h2>
      </div>

      <nav className="space-y-1">
        {steps.map((step, index) => {
          const isActive = currentStep === step.value;
          const isCompleted =
            getCurrentStepIndex() > steps.findIndex((s) => s.value === step.value);

          return (
            <Button
              key={step.value}
              variant="ghost"
              onClick={() => {
                onStepChange(step.value);
              }}
              data-state={isActive ? "active" : isCompleted ? "completed" : "inactive"}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl p-2 pr-3 text-left transition-all duration-300 ease-in-out hover:bg-gray-50 data-[state=active]:bg-[#F5F7FA] data-[state=active]:text-gray-900 data-[state=completed]:text-gray-700 data-[state=inactive]:text-gray-500"
            >
              <div className="flex items-center gap-2">
                <div
                  className="flex size-5 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600 data-[state=active]:bg-[#335CFF] data-[state=active]:text-white"
                  data-state={isActive ? "active" : "inactive"}
                >
                  {index + 1}
                </div>
                <span className="text-sm font-medium">{step.title}</span>
              </div>
              {isActive && <ChevronRight className="size-4 text-gray-900" />}
            </Button>
          );
        })}
      </nav>
    </div>
  );
}
