import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, HelpCircle, RotateCcw, Check } from "lucide-react";
import { useGuildSettings, useUpdateGuildSettings } from "@/features/settings/queries";
import { useDiscordChannels, type DiscordChannel } from "@/features/user/queries";
import { useSelectServer } from "@/features/user/ui/select-server-provider";

export default function Tickets() {
  // Get current guild
  const { selectedGuildId } = useSelectServer();

  // Fetch guild settings
  const { data: guildSettings, isLoading, error } = useGuildSettings(selectedGuildId);

  // Update settings mutation
  const updateSettingsMutation = useUpdateGuildSettings();

  // Fetch Discord channels - only text-based channels for transcripts
  const {
    data: discordChannels,
    isLoading: channelsLoading,
    error: channelsError,
  } = useDiscordChannels(selectedGuildId); // Default behavior - text channels with "None" option

  // Local state for form - only the fields we have in database
  const [formData, setFormData] = useState({
    transcriptChannelId: null as string | null,
    showClaimButton: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update form data when guild settings are loaded
  useEffect(() => {
    if (guildSettings) {
      const newFormData = {
        transcriptChannelId: guildSettings.settings.transcriptChannelId || null,
        showClaimButton: !!guildSettings.settings.showClaimButton,
      };
      setFormData(newFormData);
      setHasChanges(false);
    }
  }, [guildSettings]);

  // Track changes to enable/disable save button
  useEffect(() => {
    if (!guildSettings) return;

    const hasChanges =
      formData.transcriptChannelId !== (guildSettings.settings.transcriptChannelId || null) ||
      formData.showClaimButton !== guildSettings.settings.showClaimButton;

    setHasChanges(hasChanges);
  }, [formData, guildSettings]);

  const handleSave = async () => {
    if (!selectedGuildId || !hasChanges) return;

    setIsSubmitting(true);
    try {
      await updateSettingsMutation.mutateAsync({
        guildId: selectedGuildId,
        settings: {
          transcriptChannelId: formData.transcriptChannelId,
          showClaimButton: formData.showClaimButton,
        },
      });

      setHasChanges(false);
    } catch (error) {
      console.error("Failed to update ticket settings:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    if (guildSettings) {
      setFormData({
        transcriptChannelId: guildSettings.settings.transcriptChannelId || null,
        showClaimButton: !!guildSettings.settings.showClaimButton,
      });
      setHasChanges(false);
    }
  };

  const updateFormData = (field: keyof typeof formData, value: string | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Use real Discord channels or fallback to loading state
  const channelOptions = discordChannels || [];

  const selectedChannel = channelOptions.find(
    (ch: DiscordChannel) => ch.id === formData.transcriptChannelId
  );

  // Loading state
  if (isLoading || channelsLoading) {
    return (
      <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center text-gray-500">Loading ticket settings...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center text-red-500">Failed to load ticket settings</div>
      </div>
    );
  }

  // Channels error state (non-blocking)
  if (channelsError) {
    console.warn("Failed to load Discord channels:", channelsError);
  }

  return (
    <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-gray-200 bg-white p-8">
      <div className="space-y-8">
        {/* Transcripts Channel */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Transcripts Channel</label>
            <HelpCircle className="h-4 w-4 text-gray-400" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between border-gray-300 text-left"
                disabled={channelsLoading}
              >
                {selectedChannel
                  ? `# ${selectedChannel.name}`
                  : formData.transcriptChannelId
                    ? `Channel ${formData.transcriptChannelId} (not found)`
                    : "Select a channel"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]">
              {channelOptions.length === 0 ? (
                <DropdownMenuItem disabled>
                  {channelsError ? "Failed to load channels" : "No channels available"}
                </DropdownMenuItem>
              ) : (
                channelOptions.map((channel: DiscordChannel) => {
                  const isSelected = channel.id === formData.transcriptChannelId;
                  return (
                    <DropdownMenuItem
                      key={channel.id || "none"}
                      onSelect={() => {
                        updateFormData("transcriptChannelId", channel.id);
                      }}
                      className={isSelected ? "bg-[#103A71]/10 text-[#103A71]" : ""}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className={isSelected ? "font-medium" : ""}>
                          {channel.id ? `# ${channel.name}` : channel.name}
                        </span>
                        {isSelected && <Check className="h-4 w-4 text-[#103A71]" />}
                      </div>
                    </DropdownMenuItem>
                  );
                })
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Show Claim Button */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="show-claim-button"
            checked={formData.showClaimButton}
            onChange={(e) => {
              updateFormData("showClaimButton", e.target.checked);
            }}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-[#103A71] accent-[#103A71] focus:ring-[#103A71]"
          />
          <div>
            <label htmlFor="show-claim-button" className="text-sm font-medium text-gray-900">
              Show Claim Button
            </label>
            <p className="mt-1 text-sm text-gray-500">
              Allow staff members to claim tickets for better organization.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex w-full gap-4">
          <Button
            variant="outline"
            className="w-full rounded-lg border-gray-300 text-[#103A71]"
            onClick={handleDiscard}
            disabled={!hasChanges || isSubmitting}
          >
            Discard
          </Button>
          <Button
            className="w-full rounded-lg bg-[#103A71] hover:bg-[#103A71]/80"
            onClick={() => {
              void handleSave();
            }}
            disabled={!hasChanges || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>Apply Changes</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
