import { Button } from "@/components/ui/button";
import { Plus, Minus, HelpCircle, Loader2 } from "lucide-react";
import { useGuildSettings, useUpdateGuildSettings } from "@/features/settings/queries";
import { useSelectServer } from "@/features/user/ui/select-server-provider";
import { FormWrapper } from "@/components/forms/form-wrapper";
import { GeneralSettingsSchema } from "@ticketsbot/core/domains/guild";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// Define the form schema type
type GeneralSettingsInput = z.infer<typeof GeneralSettingsSchema>;

export default function GeneralSettings() {
  // Get current guild
  const { selectedGuildId } = useSelectServer();

  // Fetch guild settings
  const { data: guildSettings, isLoading, error } = useGuildSettings(selectedGuildId);

  // Update settings mutation
  const updateSettingsMutation = useUpdateGuildSettings();

  // Handle form submission
  const handleSubmit = async (data: GeneralSettingsInput) => {
    if (!selectedGuildId) return;

    await updateSettingsMutation.mutateAsync({
      guildId: selectedGuildId,
      settings: {
        maxTicketsPerUser: data.maxTicketsPerUser,
        language: data.language,
        allowUsersToClose: data.allowUsersToClose,
        ticketCloseConfirmation: data.ticketCloseConfirmation,
        enableUserFeedback: data.enableUserFeedback,
        anonymousDashboard: data.anonymousDashboard || false,
      },
    });
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

  // Default values from guild settings
  const defaultValues: GeneralSettingsInput = {
    maxTicketsPerUser: guildSettings?.settings.maxTicketsPerUser || 1,
    language: (guildSettings?.settings.language as "en" | "es" | "fr") || "en",
    allowUsersToClose: guildSettings?.settings.allowUsersToClose ?? true,
    ticketCloseConfirmation: guildSettings?.settings.ticketCloseConfirmation ?? true,
    enableUserFeedback: guildSettings?.settings.enableUserFeedback ?? true,
    anonymousDashboard: guildSettings?.settings.anonymousDashboard || false,
  };

  return (
    <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-gray-200 bg-white p-8">
      <FormWrapper
        schema={GeneralSettingsSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        formId="general-settings"
      >
        {(form) => (
          <div className="space-y-8">
            {/* Per User Simultaneous Ticket Limit */}
            <FormField
              control={form.control}
              name="maxTicketsPerUser"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-4 flex items-center gap-2">
                    <FormLabel>Per User Simultaneous Ticket Limit</FormLabel>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </div>
                  <FormControl>
                    <div className="relative w-full">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute bottom-0 left-0 top-0 z-10 h-full w-10 rounded-r-none border-r-0 border-gray-300 p-0"
                        onClick={() => field.onChange(Math.max(1, field.value - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        className="w-full border-gray-300 pl-12 pr-12 text-center [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        min="1"
                        max="10"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute bottom-0 right-0 top-0 z-10 h-full w-10 rounded-l-none border-l-0 border-gray-300 p-0"
                        onClick={() => field.onChange(Math.min(10, field.value + 1))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Language */}
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Checkboxes */}
            <div className="space-y-6">
              {/* Allow Users to close ticket */}
              <FormField
                control={form.control}
                name="allowUsersToClose"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Allow Users to close ticket</FormLabel>
                      <FormDescription>
                        When enabled, users can close their own tickets using the close button.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Ticket Close Confirmation */}
              <FormField
                control={form.control}
                name="ticketCloseConfirmation"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Ticket Close Confirmation</FormLabel>
                      <FormDescription>
                        Show a confirmation dialog before closing tickets to prevent accidental closures.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {/* Enable User Feedback */}
              <FormField
                control={form.control}
                name="enableUserFeedback"
                render={({ field }) => (
                  <FormItem className="flex items-start gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable User Feedback</FormLabel>
                      <FormDescription>
                        Allow users to provide feedback ratings when their tickets are closed.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

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
