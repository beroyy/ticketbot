import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { FormWrapper } from "@/components/forms";
import { panelFormSchema, type PanelFormData } from "../../schemas/panel-form-schema";
import { PropertiesStep } from "./steps/properties-step";
import { ContentStep } from "./steps/content-step";
import { WelcomeStep } from "./steps/welcome-step";
import { AccessStep } from "./steps/access-step";
import { DiscordPreview } from "./discord-preview";

interface PanelWizardV2Props {
  mode: "create" | "edit";
  initialValues?: PanelFormData;
  onSubmit: (data: PanelFormData) => Promise<void>;
  onCancel: () => void;
  onDraftSave?: (data: PanelFormData) => void;
  isSubmitting?: boolean;
}

const steps = [
  { id: "properties", label: "Properties", component: PropertiesStep },
  { id: "content", label: "Content", component: ContentStep },
  { id: "welcome", label: "Welcome", component: WelcomeStep },
  { id: "access", label: "Access", component: AccessStep },
];

const defaultValues: Partial<PanelFormData> = {
  buttonText: "Create Ticket",
  buttonColor: "#5865F2",
  questions: [
    {
      id: "1",
      type: "short_answer",
      label: "Why are you creating this ticket?",
      placeholder: "Describe your issue...",
      enabled: true,
    },
    {
      id: "2",
      type: "paragraph",
      label: "Additional details",
      placeholder: "Provide more information...",
      enabled: true,
      characterLimit: 500,
    },
  ],
  textSections: [],
  accessControl: {
    allowEveryone: true,
    roles: [],
  },
  hideMentions: false,
};

export function PanelWizardV2({
  mode,
  initialValues: providedInitialValues,
  onSubmit,
  onCancel,
  onDraftSave,
  isSubmitting = false,
}: PanelWizardV2Props) {
  const [currentStep, setCurrentStep] = useState(0);

  const initialValues = providedInitialValues || defaultValues;

  const handleSubmit = async (data: PanelFormData) => {
    await onSubmit(data);
  };

  const handleStepChange = (value: string) => {
    const stepIndex = steps.findIndex((s) => s.id === value);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const CurrentStepComponent = steps[currentStep]?.component;

  return (
    <FormWrapper
      schema={panelFormSchema}
      defaultValues={initialValues}
      onSubmit={handleSubmit}
      formId="panel-wizard"
    >
      {(form) => (
        <div className="flex h-full">
          {/* Left side - Form */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold">
                    {mode === "create" ? "Create Panel" : "Edit Panel"}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.label}
                  </p>
                </div>
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>

              {/* Tabs */}
              <Tabs value={steps[currentStep]?.id} onValueChange={handleStepChange}>
                <TabsList className="mb-6 grid w-full grid-cols-4">
                  {steps.map((step, index) => (
                    <TabsTrigger
                      key={step.id}
                      value={step.id}
                      disabled={index > currentStep && form.formState.isDirty}
                      className="relative"
                    >
                      {step.label}
                      {index < currentStep && (
                        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-green-500" />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Step Content */}
                <TabsContent value={steps[currentStep]?.id || ""} className="mt-0">
                  {CurrentStepComponent && <CurrentStepComponent form={form} />}
                </TabsContent>
              </Tabs>

              {/* Navigation */}
              <div className="mt-8 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isFirstStep}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                {isLastStep ? (
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting || form.formState.isSubmitting || !form.formState.isValid
                    }
                  >
                    {(isSubmitting || form.formState.isSubmitting) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {mode === "create" ? "Create Panel" : "Update Panel"}
                  </Button>
                ) : (
                  <Button type="button" onClick={handleNext} disabled={!form.formState.isValid}>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Preview */}
          <div className="w-96 border-l bg-gray-50">
            <div className="p-6">
              <h2 className="mb-4 text-lg font-semibold">Preview</h2>
              <DiscordPreview data={form.watch()} />
            </div>
          </div>
        </div>
      )}
    </FormWrapper>
  );
}
