import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { FlattenedPanelFormData, TextSection, ValidationErrors } from "../../types";
import { CollapsibleSection } from "../collapsible-section";

interface WelcomeStepProps {
  formData: FlattenedPanelFormData;
  textSections: TextSection[];
  validationErrors: ValidationErrors;
  onFieldChange: <K extends keyof FlattenedPanelFormData>(
    field: K,
    value: FlattenedPanelFormData[K]
  ) => void;
  onTextSectionAdd: () => void;
  onTextSectionUpdate: (id: string, updates: Partial<TextSection>) => void;
  onTextSectionRemove: (id: string) => void;
}

export default function WelcomeStep({
  formData,
  textSections,
  onFieldChange,
  onTextSectionAdd,
  onTextSectionUpdate,
  onTextSectionRemove,
}: WelcomeStepProps) {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 text-lg font-semibold text-gray-900">Welcome Message</h3>
        <p className="text-sm text-gray-500">
          Configure the message sent when a new ticket is opened
        </p>
      </div>

      {/* Welcome Message */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Welcome Message <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={formData.welcomeMessage || ""}
          onChange={(e) => {
            onFieldChange("welcomeMessage", e.target.value);
          }}
          placeholder="Thank you for opening a ticket! A member of our support team will assist you shortly."
          className="focus:ring-ring/20 focus:border-ring/50 min-h-[120px] w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm caret-gray-400 transition-colors focus:outline-none focus:ring-1"
          rows={5}
        />
      </div>

      {/* Intro Title */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Intro Title <span className="text-gray-400">(optional)</span>
        </label>
        <Input
          value={formData.introTitle || ""}
          onChange={(e) => {
            onFieldChange("introTitle", e.target.value);
          }}
          placeholder="Welcome!"
          className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3 text-sm"
        />
      </div>

      {/* Intro Description */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Intro Description <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={formData.introDescription || ""}
          onChange={(e) => {
            onFieldChange("introDescription", e.target.value);
          }}
          placeholder="Please describe your issue in detail and our team will help you."
          className="focus:ring-ring/20 focus:border-ring/50 min-h-[100px] w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm caret-gray-400 transition-colors focus:outline-none focus:ring-1"
          rows={4}
        />
      </div>

      {/* Fields/Text Sections */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-700">
              Fields <span className="text-gray-400">(optional)</span>
            </h4>
            <p className="text-xs text-gray-500">Add custom fields to your welcome message</p>
          </div>
          <Button
            type="button"
            onClick={onTextSectionAdd}
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-lg border-gray-200 text-xs hover:bg-gray-50"
          >
            <Plus className="size-3" />
            Add Field
          </Button>
        </div>

        {textSections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">No fields added yet</p>
            <Button
              type="button"
              onClick={onTextSectionAdd}
              variant="outline"
              size="sm"
              className="mt-3 h-8 gap-1.5 rounded-lg border-gray-200 text-xs hover:bg-gray-50"
            >
              <Plus className="size-3" />
              Add your first field
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {textSections.map((section) => (
              <CollapsibleSection
                key={section.id}
                title={section.name || "Untitled Field"}
                isExpanded={expandedSections[section.id] || false}
                onToggle={() => {
                  toggleSection(section.id);
                }}
              >
                <div className="space-y-3 pt-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">
                      Field Name
                    </label>
                    <Input
                      value={section.name}
                      onChange={(e) => {
                        onTextSectionUpdate(section.id, { name: e.target.value });
                      }}
                      placeholder="Support Information"
                      className="h-9 rounded-lg border-gray-200 bg-white px-3 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">
                      Field Value
                    </label>
                    <textarea
                      value={section.value}
                      onChange={(e) => {
                        onTextSectionUpdate(section.id, { value: e.target.value });
                      }}
                      placeholder="Please be patient while we review your request..."
                      className="focus:ring-ring/20 focus:border-ring/50 min-h-[80px] w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm caret-gray-400 transition-colors focus:outline-none focus:ring-1"
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                        disabled
                      >
                        <GripVertical className="size-3.5" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        onTextSectionRemove(section.id);
                      }}
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="size-3" />
                      Remove
                    </Button>
                  </div>
                </div>
              </CollapsibleSection>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
