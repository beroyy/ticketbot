import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, HelpCircle, RotateCcw } from "lucide-react";
import { useGuildSettings, useUpdateGuildSettings } from "@/features/settings/queries";
import { useSelectServer } from "@/features/user/ui/select-server-provider";

export default function OpenCommands() {
  // Get current guild
  const { selectedGuildId } = useSelectServer();

  // Fetch guild settings
  const { data: guildSettings, isLoading, error } = useGuildSettings(selectedGuildId);

  // Update settings mutation
  const updateSettingsMutation = useUpdateGuildSettings();

  // Local state for form
  const [formData, setFormData] = useState({
    openCommandsEnabled: true,
    channelCategory: "Server Stats",
    namedScheme: "Ticket - 1",
    welcomeMessage:
      "Thank you for contacting support.\nplease describe your issue and await a response.",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Update form data when guild settings are loaded
  useEffect(() => {
    if (guildSettings) {
      const newFormData = {
        openCommandsEnabled: !!guildSettings.settings.openCommandsEnabled,
        channelCategory: guildSettings.settings.channelCategory || "Server Stats",
        namedScheme: guildSettings.settings.namedScheme || "Ticket - 1",
        welcomeMessage:
          guildSettings.settings.welcomeMessage ||
          "Thank you for contacting support.\nplease describe your issue and await a response.",
      };
      setFormData(newFormData);
      setHasChanges(false);
    }
  }, [guildSettings]);

  // Track changes to enable/disable save button
  useEffect(() => {
    if (!guildSettings) return;

    const hasChanges =
      formData.openCommandsEnabled !== guildSettings.settings.openCommandsEnabled ||
      formData.channelCategory !== (guildSettings.settings.channelCategory || "Server Stats") ||
      formData.namedScheme !== (guildSettings.settings.namedScheme || "Ticket - 1") ||
      formData.welcomeMessage !==
        (guildSettings.settings.welcomeMessage ||
          "Thank you for contacting support.\nplease describe your issue and await a response.");

    setHasChanges(hasChanges);
  }, [formData, guildSettings]);

  const handleSave = async () => {
    if (!selectedGuildId || !hasChanges) return;

    setSaveError(null);
    setIsSubmitting(true);
    try {
      await updateSettingsMutation.mutateAsync({
        guildId: selectedGuildId,
        settings: {
          openCommandsEnabled: formData.openCommandsEnabled,
          channelCategory: formData.channelCategory,
          namedScheme: formData.namedScheme,
          welcomeMessage: formData.welcomeMessage,
        },
      });

      setHasChanges(false);
    } catch (error) {
      console.error("Failed to update settings:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    if (guildSettings) {
      setFormData({
        openCommandsEnabled: !!guildSettings.settings.openCommandsEnabled,
        channelCategory: guildSettings.settings.channelCategory || "Server Stats",
        namedScheme: guildSettings.settings.namedScheme || "Ticket - 1",
        welcomeMessage:
          guildSettings.settings.welcomeMessage ||
          "Thank you for contacting support.\nplease describe your issue and await a response.",
      });
      setHasChanges(false);
    }
  };

  const updateFormData = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center text-gray-500">Loading settings...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center text-red-500">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-gray-200 bg-white p-8">
      <div className="space-y-8">
        {/* Open Commands Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-700">Open Commands</h3>
          </div>
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#103A71] focus:ring-offset-2 ${
              formData.openCommandsEnabled ? "bg-[#103A71]" : "bg-gray-200"
            }`}
            onClick={() => {
              updateFormData("openCommandsEnabled", !formData.openCommandsEnabled);
            }}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                formData.openCommandsEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Channel Category */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Channel Category</label>
            <HelpCircle className="h-4 w-4 text-gray-400" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between border-gray-300 text-left"
              >
                {formData.channelCategory}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              <DropdownMenuItem
                onSelect={() => {
                  updateFormData("channelCategory", "Server Stats");
                }}
              >
                Server Stats
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  updateFormData("channelCategory", "Support");
                }}
              >
                Support
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  updateFormData("channelCategory", "General");
                }}
              >
                General
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Named Scheme */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Named Scheme</label>
            <HelpCircle className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="ticket-1"
                name="named-scheme"
                type="radio"
                checked={formData.namedScheme === "Ticket - 1"}
                onChange={() => {
                  updateFormData("namedScheme", "Ticket - 1");
                }}
                className="h-4 w-4 border-gray-300 text-[#103A71] accent-[#103A71] focus:ring-[#103A71]"
              />
              <label htmlFor="ticket-1" className="ml-3 text-sm font-medium text-gray-900">
                Ticket - 1
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="ticket-username"
                name="named-scheme"
                type="radio"
                checked={formData.namedScheme === "Ticket - Username"}
                onChange={() => {
                  updateFormData("namedScheme", "Ticket - Username");
                }}
                className="h-4 w-4 border-gray-300 text-[#103A71] accent-[#103A71] focus:ring-[#103A71]"
              />
              <label htmlFor="ticket-username" className="ml-3 text-sm font-medium text-gray-900">
                Ticket - Username
              </label>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Welcome Message</label>
            <HelpCircle className="h-4 w-4 text-gray-400" />
          </div>
          <textarea
            rows={4}
            value={formData.welcomeMessage}
            onChange={(e) => {
              updateFormData("welcomeMessage", e.target.value);
            }}
            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-[#103A71] focus:outline-none focus:ring-[#103A71]"
            placeholder="Enter welcome message..."
          />
        </div>

        {/* Error Display */}
        {saveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="text-sm text-red-600">{saveError}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex w-full gap-4">
          <Button
            variant="outline"
            className="w-full rounded-lg border-gray-300 text-[#103A71]"
            onClick={handleDiscard}
            disabled={!hasChanges || isSubmitting}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
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
