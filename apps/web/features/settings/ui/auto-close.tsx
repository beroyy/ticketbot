import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useGuildSettings, useUpdateGuildSettings } from "@/features/settings/queries";
import { useSelectServer } from "@/features/user/ui/select-server-provider";
import { FormWrapper } from "@/components/forms/form-wrapper";
import { AutoCloseSchema } from "@ticketsbot/core/domains/guild";
import { z } from "zod";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MultiSelect } from "@/components/ui/multi-select";
import { useDiscordRoles } from "@/features/user/queries";

// Define the form schema type
type AutoCloseInput = z.infer<typeof AutoCloseSchema>;

export default function AutoClose() {
  // Get current guild
  const { selectedGuildId } = useSelectServer();

  // Fetch guild settings
  const { data: guildSettings, isLoading, error } = useGuildSettings(selectedGuildId);
  
  // Fetch Discord roles for exempt roles selector
  const { data: discordRoles = [] } = useDiscordRoles(selectedGuildId);

  // Update settings mutation
  const updateSettingsMutation = useUpdateGuildSettings();

  // Handle form submission
  const handleSubmit = async (data: AutoCloseInput) => {
    if (!selectedGuildId) return;

    await updateSettingsMutation.mutateAsync({
      guildId: selectedGuildId,
      settings: {
        autoCloseEnabled: data.enabled,
        autoCloseHours: data.inactiveHours,
        // Note: These fields may need to be stored in a different way
        // depending on the backend implementation
      },
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center text-gray-500">Loading auto-close settings...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center text-red-500">Failed to load auto-close settings</div>
      </div>
    );
  }

  // Default values from guild settings
  const defaultValues: AutoCloseInput = {
    enabled: guildSettings?.settings.autoCloseEnabled || false,
    inactiveHours: guildSettings?.settings.autoCloseHours || 24,
    warningMessage: "", // Will need to be stored in metadata or elsewhere
    exemptRoles: [], // Will need to be stored in metadata or elsewhere
  };
  
  // Role options for the multiselect
  const roleOptions = discordRoles.map((role) => ({
    value: role.id || "",
    label: role.name,
  }));

  return (
    <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-gray-200 bg-white p-8">
      <FormWrapper
        schema={AutoCloseSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        formId="auto-close-settings"
      >
        {(form) => (
          <div className="space-y-8">
            {/* Auto Close Header */}
            <div>
              <h3 className="mb-6 text-lg font-medium text-gray-900">Auto Close</h3>
            </div>

            {/* Enabled Toggle */}
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-4">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-[#103A71]"
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enabled</FormLabel>
                    <FormDescription>
                      If enabled, tickets will be automatically closed after the set number of hours.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Auto Close Hours Setting */}
            <FormField
              control={form.control}
              name="inactiveHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inactive Hours</FormLabel>
                  <FormControl>
                    <div className="relative mx-auto w-32">
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        className={`pr-16 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                          form.watch("enabled")
                            ? "border-gray-300"
                            : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                        }`}
                        min="1"
                        max="720"
                        disabled={!form.watch("enabled")}
                      />
                      <span
                        className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm uppercase tracking-wide ${
                          form.watch("enabled") ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        HOURS
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    Tickets will be closed after this many hours of inactivity (1-720 hours, up to 30 days).
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Warning Message (Optional) */}
            <FormField
              control={form.control}
              name="warningMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warning Message (Optional)</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      value={field.value || ""}
                      className={`min-h-[80px] w-full rounded-md border px-3 py-2 text-sm ${
                        form.watch("enabled")
                          ? "border-gray-300"
                          : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                      }`}
                      placeholder="Message to send before auto-closing..."
                      disabled={!form.watch("enabled")}
                    />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    Optional message to send in the ticket before it's automatically closed.
                  </FormDescription>
                </FormItem>
              )}
            />
            
            {/* Exempt Roles */}
            <FormField
              control={form.control}
              name="exemptRoles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exempt Roles</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={roleOptions}
                      selected={field.value || []}
                      onChange={field.onChange}
                      placeholder="Select roles to exempt from auto-close"
                      disabled={!form.watch("enabled")}
                    />
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    Tickets opened by users with these roles will not be automatically closed.
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex w-full gap-4">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-lg border-gray-300 text-[#103A71]"
                onClick={() => form.reset()}
                disabled={!form.formState.isDirty || form.formState.isSubmitting}
              >
                Discard
              </Button>
              <Button
                type="submit"
                className="w-full rounded-lg bg-[#103A71] hover:bg-[#103A71]/80"
                disabled={!form.formState.isDirty || form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>Apply Changes</>
                )}
              </Button>
            </div>
          </div>
        )}
      </FormWrapper>
    </div>
  );
}