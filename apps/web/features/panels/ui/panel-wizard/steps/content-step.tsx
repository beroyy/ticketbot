import React from "react";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/ui/color-picker";
import { EmojiInput } from "@/components/ui/emoji-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FlattenedPanelFormData, Question, ValidationErrors } from "../../types";
import type { DiscordChannel } from "@/features/user/queries";
import QuestionBuilder from "../question-builder";

interface ContentStepProps {
  formData: FlattenedPanelFormData;
  questions: Question[];
  validationErrors: ValidationErrors;
  onFieldChange: <K extends keyof FlattenedPanelFormData>(
    field: K,
    value: FlattenedPanelFormData[K]
  ) => void;
  onQuestionAdd: () => void;
  onQuestionUpdate: (id: string, updates: Partial<Question>) => void;
  onQuestionRemove: (id: string) => void;
  onQuestionToggle: (id: string) => void;
  discordChannels: DiscordChannel[] | undefined;
  channelsLoading: boolean;
}

export default function ContentStep({
  formData,
  questions,
  validationErrors,
  onFieldChange,
  onQuestionAdd,
  onQuestionUpdate,
  onQuestionRemove,
  onQuestionToggle,
  discordChannels,
  channelsLoading,
}: ContentStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 text-lg font-semibold text-gray-900">Panel Content</h3>
      </div>

      {/* Panel Title and Description */}
      <div className="grid gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Panel Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.category}
            onChange={(e) => {
              onFieldChange("category", e.target.value);
            }}
            placeholder="General Support"
            className={cn(
              "w-full rounded-lg bg-gray-50 px-4 py-3 text-sm",
              validationErrors["category"] ? "border-red-500" : "nice-gray-border"
            )}
          />
          {validationErrors["category"] && (
            <p className="mt-1 text-xs text-red-500">{validationErrors["category"]}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Panel Content <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={formData.introDescription || ""}
            onChange={(e) => {
              onFieldChange("introDescription", e.target.value);
            }}
            placeholder="Feel free to open a ticket if you need any help. Our Support Team will review it and get back to you as soon as possible!"
            className="focus:ring-ring/20 focus:border-ring/50 min-h-[100px] w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm caret-gray-400 transition-colors focus:outline-none focus:ring-1"
            rows={4}
          />
        </div>
      </div>

      {/* Channel */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Channel <span className="text-red-500">*</span>
        </label>
        <Select
          value={formData.channel}
          onValueChange={(value) => {
            onFieldChange("channel", value);
          }}
          disabled={channelsLoading}
        >
          <SelectTrigger
            className={cn(
              "focus-visible:ring-ring/20 focus:ring-ring/20 h-auto w-full rounded-lg bg-gray-50 px-4 py-3 text-sm font-normal focus:outline-none focus:ring-1 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-1",
              validationErrors["channel"] ? "border-red-500" : "nice-gray-border"
            )}
          >
            <SelectValue
              placeholder={channelsLoading ? "Loading channels..." : "Select a channel"}
            />
          </SelectTrigger>
          <SelectContent>
            {!channelsLoading &&
              discordChannels &&
              discordChannels
                .filter((channel) => channel.type === 0)
                .sort((a, b) => a.position - b.position)
                .map((channel) => (
                  <SelectItem key={channel.id} value={channel.id || ""}>
                    # {channel.name}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
        {validationErrors["channel"] && (
          <p className="mt-1 text-xs text-red-500">{validationErrors["channel"]}</p>
        )}
      </div>

      {/* Button Settings */}
      <div className="nice-gray-border space-y-3 rounded-2xl p-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Button Text</label>
          <Input
            value={formData.buttonText}
            onChange={(e) => {
              onFieldChange("buttonText", e.target.value);
            }}
            placeholder="Open ticket!"
            className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Button Colour</label>
            <ColorPicker
              value={formData.color || "#2096FF"}
              onChange={(color) => {
                onFieldChange("color", color);
              }}
              placeholder="#2096FF"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Button Emoji</label>
            <EmojiInput
              value={formData.emoji || ""}
              onChange={(emoji) => {
                onFieldChange("emoji", emoji);
              }}
              placeholder="Select an emoji..."
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Image URL */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Image (optional)</label>
        <Input
          value={formData.largeImageUrl || ""}
          onChange={(e) => {
            onFieldChange("largeImageUrl", e.target.value);
          }}
          placeholder="https://your-image-url.com"
          className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3 text-sm"
        />
      </div>

      {/* Thumbnail URL */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Thumbnail (optional)</label>
        <Input
          value={formData.smallImageUrl || ""}
          onChange={(e) => {
            onFieldChange("smallImageUrl", e.target.value);
          }}
          placeholder="https://your-thumbnail-url.com"
          className="w-full rounded-lg border-gray-200 bg-gray-50 px-4 py-3 text-sm"
        />
      </div>

      {/* Questions */}
      <QuestionBuilder
        questions={questions}
        onAdd={onQuestionAdd}
        onUpdate={onQuestionUpdate}
        onRemove={onQuestionRemove}
        onToggle={onQuestionToggle}
      />
    </div>
  );
}
