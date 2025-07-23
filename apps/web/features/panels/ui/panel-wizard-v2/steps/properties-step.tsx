import React from "react";
import type { UseFormReturn } from "react-hook-form";
import { TextField, SelectField } from "@/components/forms/form-fields";
// Removed EmojiPicker import - will use a TextField for now
import { ColorPicker } from "@/components/ui/color-picker";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useDiscordChannels } from "@/features/user/queries";
import { useTeamRoles } from "@/features/settings/queries";
import { useSelectServer } from "@/features/user/ui/select-server-provider";
import type { PanelFormData } from "../../../schemas/panel-form-schema";

interface PropertiesStepProps {
  form: UseFormReturn<PanelFormData>;
}

export function PropertiesStep({ form }: PropertiesStepProps) {
  const { selectedGuildId } = useSelectServer();

  // Fetch Discord channels (text channels = type 0)
  const { data: channels = [], isLoading: channelsLoading } = useDiscordChannels(
    selectedGuildId,
    [0],
    false
  );

  // Fetch team roles
  const { data: teamRoles = [], isLoading: rolesLoading } = useTeamRoles(selectedGuildId);

  const channelOptions = channels.map((channel) => ({
    label: `#${channel.name}`,
    value: channel.id || "",
  }));

  const teamOptions = teamRoles.map((role: any) => ({
    label: role.name,
    value: String(role.id),
  }));

  return (
    <div className="space-y-6">
      {/* Channel Selection */}
      <SelectField
        name="channelId"
        label="Channel"
        description="Select the channel where the panel will be posted"
        placeholder={channelsLoading ? "Loading channels..." : "Select a channel"}
        options={channelOptions}
        disabled={channelsLoading}
        required
      />

      {/* Panel Title */}
      <TextField
        name="title"
        label="Panel Title"
        description="The title displayed on the panel"
        placeholder="Support Panel"
        required
      />

      {/* Button Text */}
      <TextField
        name="buttonText"
        label="Button Text"
        description="Text displayed on the ticket creation button"
        placeholder="Create Ticket"
        required
      />

      {/* Emoji Field */}
      <TextField
        name="emoji"
        label="Button Emoji"
        description="Emoji to display on the button (optional)"
        placeholder="🎫"
      />

      {/* Color Picker */}
      <FormField
        control={form.control}
        name="buttonColor"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Button Color</FormLabel>
            <FormControl>
              <ColorPicker value={field.value || "#5865F2"} onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Team Selection */}
      {teamOptions.length > 0 && (
        <SelectField
          name="teamId"
          label="Assign to Team"
          description="Automatically assign tickets to a specific team"
          placeholder="Select a team (optional)"
          options={teamOptions}
          disabled={rolesLoading}
        />
      )}
    </div>
  );
}
