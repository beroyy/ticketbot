import React from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FlattenedPanelFormData, ValidationErrors } from "../../types";
import type { DiscordChannel } from "@/features/user/queries";

interface DiscordRole {
  id: string;
  name: string;
  color?: string;
  position?: number;
}

interface TeamRole {
  id: number;
  name: string;
  color: string;
}

interface Form {
  id: number;
  name: string;
}

interface PropertiesStepProps {
  formData: FlattenedPanelFormData;
  validationErrors: ValidationErrors;
  onFieldChange: <K extends keyof FlattenedPanelFormData>(
    field: K,
    value: FlattenedPanelFormData[K]
  ) => void;
  discordRoles: DiscordRole[] | undefined;
  rolesLoading: boolean;
  teamRoles: TeamRole[];
  teamRolesLoading: boolean;
  discordChannels: DiscordChannel[] | undefined;
  channelsLoading: boolean;
  forms: Form[] | undefined;
  formsLoading: boolean;
}

export default function PropertiesStep({
  formData,
  onFieldChange,
  discordRoles,
  rolesLoading,
  teamRoles,
  teamRolesLoading,
  discordChannels,
  channelsLoading,
  forms,
  formsLoading,
}: PropertiesStepProps) {
  const selectedRoles = formData.mentionOnOpen
    ? formData.mentionOnOpen.split(",").filter(Boolean)
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 border-b border-gray-200 pb-4 font-semibold text-gray-900">
          Ticket Properties
        </h3>
      </div>

      {/* Mention on Open */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Mention on Open</label>
        <MultiSelect
          options={[
            { value: "ticket-opener", label: "Ticket Opener" },
            { value: "here", label: "@here" },
            { value: "everyone", label: "@everyone" },
            ...(discordRoles?.map((role) => ({
              value: role.id,
              label: role.name,
            })) || []),
          ]}
          selected={selectedRoles}
          onChange={(selected) => {
            onFieldChange("mentionOnOpen", selected.join(","));
          }}
          placeholder={rolesLoading ? "Loading roles..." : "Select roles..."}
          disabled={rolesLoading}
        />
      </div>

      {/* Select Team */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Select Role <span className="text-red-500">*</span>
        </label>
        <Select
          value={formData.selectTeam || ""}
          onValueChange={(value) => {
            onFieldChange("selectTeam", value);
          }}
          disabled={teamRolesLoading || teamRoles.length === 0}
        >
          <SelectTrigger className="nice-gray-border focus-visible:ring-ring/20 focus:ring-ring/20 h-auto w-full rounded-lg bg-gray-50 px-4 py-3 text-sm font-normal focus:outline-none focus:ring-1 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-1">
            <SelectValue
              placeholder={
                teamRolesLoading
                  ? "Loading roles..."
                  : teamRoles.length === 0
                    ? "No roles available"
                    : "Select a role"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {teamRoles.map((role) => (
              <SelectItem key={role.id} value={role.id.toString()}>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: role.color }} />
                  <span>{role.name.charAt(0).toUpperCase() + role.name.slice(1)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {teamRoles.length === 0 && !teamRolesLoading && (
          <p className="mt-1 text-xs text-gray-500">
            No roles have been created for this server yet.
          </p>
        )}
      </div>

      {/* Hide Mentions */}
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Hide Mentions</span>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => {
                onFieldChange("hideMentions", !formData.hideMentions);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${
                formData.hideMentions ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  formData.hideMentions ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          A mentioned user will still receive a notification, but @username will be hidden.
        </p>
      </div>

      {/* Ticket Category and Form */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Ticket Category</label>
          <Select
            value={formData.ticketCategory || ""}
            onValueChange={(value) => {
              onFieldChange("ticketCategory", value);
            }}
            disabled={channelsLoading}
          >
            <SelectTrigger className="nice-gray-border focus-visible:ring-ring/20 focus:ring-ring/20 h-auto w-full rounded-lg bg-gray-50 px-4 py-3 text-sm font-normal focus:outline-none focus:ring-1 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-1">
              <SelectValue
                placeholder={channelsLoading ? "Loading categories..." : "Select a category"}
              />
            </SelectTrigger>
            <SelectContent>
              {!channelsLoading && discordChannels
                ? discordChannels
                    .filter((channel) => channel.type === 4)
                    .sort((a, b) => a.position - b.position)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id || ""}>
                        {category.name}
                      </SelectItem>
                    ))
                : null}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Form</label>
          <Select
            value={formData.form === "None" || !formData.form ? "none" : formData.form}
            onValueChange={(value) => {
              onFieldChange("form", value === "none" ? "" : value);
            }}
            disabled={formsLoading}
          >
            <SelectTrigger className="nice-gray-border focus-visible:ring-ring/20 focus:ring-ring/20 h-auto w-full rounded-lg bg-gray-50 px-4 py-3 text-sm font-normal focus:outline-none focus:ring-1 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-1">
              <SelectValue placeholder={formsLoading ? "Loading forms..." : "None"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {!formsLoading &&
                forms &&
                forms.map((form) => (
                  <SelectItem key={form.id} value={form.id.toString()}>
                    {form.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Naming Scheme */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Naming Scheme</label>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Use Server Default</span>
          <button
            type="button"
            onClick={() => {
              onFieldChange("namingScheme", !formData.namingScheme);
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500/30 ${
              formData.namingScheme ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                formData.namingScheme ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Exit Survey Form */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Exit Survey Form</label>
        <Select
          value={formData.exitSurveyForm || "none"}
          onValueChange={(value) => {
            onFieldChange("exitSurveyForm", value === "none" ? "" : value);
          }}
          disabled={formsLoading}
        >
          <SelectTrigger className="nice-gray-border focus-visible:ring-ring/20 focus:ring-ring/20 h-auto w-full rounded-lg bg-gray-50 px-4 py-3 text-sm font-normal focus:outline-none focus:ring-1 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-1">
            <SelectValue placeholder={formsLoading ? "Loading forms..." : "None"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {!formsLoading &&
              forms &&
              forms.map((form) => (
                <SelectItem key={form.id} value={form.id.toString()}>
                  {form.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Awaiting Response Category */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Awaiting Response Category
        </label>
        <Select
          value={formData.awaitingResponseCategory || "none"}
          onValueChange={(value) => {
            onFieldChange("awaitingResponseCategory", value === "none" ? "" : value);
          }}
          disabled={channelsLoading}
        >
          <SelectTrigger className="nice-gray-border focus-visible:ring-ring/20 focus:ring-ring/20 h-auto w-full rounded-lg bg-gray-50 px-4 py-3 text-sm font-normal focus:outline-none focus:ring-1 focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-1">
            <SelectValue placeholder={channelsLoading ? "Loading categories..." : "None"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {!channelsLoading &&
              discordChannels &&
              discordChannels
                .filter((channel) => channel.type === 4)
                .sort((a, b) => a.position - b.position)
                .map((category) => (
                  <SelectItem key={category.id} value={category.id || ""}>
                    {category.name}
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
