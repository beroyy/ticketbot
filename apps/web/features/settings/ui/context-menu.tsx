import { Button } from "@/components/ui/button";
import { Loader2, HelpCircle, Plus, Trash2 } from "lucide-react";
import { useGuildSettings, useUpdateGuildSettings } from "@/features/settings/queries";
import { useSelectServer } from "@/features/user/ui/select-server-provider";
import { FormWrapper } from "@/components/forms/form-wrapper";
import { ContextMenuSchema } from "@ticketsbot/core/domains/guild/client";
import { z } from "zod";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useFieldArray } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";

// Extended schema for UI to match existing settings structure
const ExtendedContextMenuSchema = z.object({
  enabled: z.boolean(),
  options: z
    .array(
      z.object({
        label: z.string().min(1, "Label required").max(100, "Label too long"),
        emoji: z.string().max(32).optional(),
        description: z.string().max(100).optional(),
      })
    )
    .max(25, "Maximum 25 menu options allowed"),
  requiredPermissionLevel: z.string().default("Everyone"),
  addMessageSenderToTicket: z.boolean().default(true),
  useSettingsFromPanel: z.string().default("None"),
});

// Define the form schema type
type ContextMenuInput = z.infer<typeof ExtendedContextMenuSchema>;

export default function ContextMenu() {
  // Get current guild
  const { selectedGuildId } = useSelectServer();

  // Fetch guild settings
  const { data: guildSettings, isLoading, error } = useGuildSettings(selectedGuildId);

  // Update settings mutation
  const updateSettingsMutation = useUpdateGuildSettings();

  // Handle form submission
  const handleSubmit = async (data: ContextMenuInput) => {
    if (!selectedGuildId) return;

    await updateSettingsMutation.mutateAsync({
      guildId: selectedGuildId,
      settings: {
        requiredPermissionLevel: data.requiredPermissionLevel,
        addMessageSenderToTicket: data.addMessageSenderToTicket,
        useSettingsFromPanel: data.useSettingsFromPanel,
        // Store context menu specific data in metadata or other fields
        // For now, we'll just save the basic settings
      },
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center text-gray-500">Loading context menu settings...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center text-red-500">Failed to load context menu settings</div>
      </div>
    );
  }

  // Default values from guild settings
  const defaultValues: ContextMenuInput = {
    enabled: false, // Will need to be stored elsewhere
    options: [
      { label: "Create Support Ticket", emoji: "🎫", description: "Open a support ticket" },
    ],
    requiredPermissionLevel: guildSettings?.settings.requiredPermissionLevel || "Everyone",
    addMessageSenderToTicket: guildSettings?.settings.addMessageSenderToTicket ?? true,
    useSettingsFromPanel: guildSettings?.settings.useSettingsFromPanel || "None",
  };

  return (
    <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-gray-200 bg-white p-8">
      <FormWrapper
        schema={ExtendedContextMenuSchema}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        formId="context-menu-settings"
      >
        {(form) => (
          <div className="space-y-8">
            {/* Context Menu Header */}
            <div>
              <h3 className="mb-6 text-lg font-medium text-gray-900">Context Menu</h3>
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
                      Allow users to create tickets by right-clicking on messages
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Permission Level */}
            <FormField
              control={form.control}
              name="requiredPermissionLevel"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Required Permission Level</FormLabel>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </div>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!form.watch("enabled")}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select permission level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Everyone">Everyone</SelectItem>
                      <SelectItem value="Staff">Staff Only</SelectItem>
                      <SelectItem value="Admin">Admin Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional Options */}
            <FormField
              control={form.control}
              name="addMessageSenderToTicket"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!form.watch("enabled")}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Add Message Sender to Ticket
                    </FormLabel>
                    <FormDescription>
                      Automatically add the message author to the created ticket
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Panel Settings */}
            <FormField
              control={form.control}
              name="useSettingsFromPanel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Use Settings From Panel</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!form.watch("enabled")}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select panel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Panel1">Support Panel</SelectItem>
                      <SelectItem value="Panel2">Sales Panel</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Inherit settings like category, welcome message, and team assignment from a panel
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Context Menu Options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Menu Options</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const options = form.getValues("options");
                    form.setValue("options", [
                      ...options,
                      { label: "", emoji: "", description: "" }
                    ]);
                  }}
                  disabled={!form.watch("enabled") || form.watch("options").length >= 25}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Option
                </Button>
              </div>
              <FormField
                control={form.control}
                name="options"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-3">
                      {field.value.map((option, index) => (
                        <div key={index} className="rounded-lg border p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-3">
                              <div>
                                <label className="text-sm font-medium">Label *</label>
                                <Input
                                  value={option.label}
                                  onChange={(e) => {
                                    const newOptions = [...field.value];
                                    newOptions[index] = { 
                                      label: e.target.value,
                                      emoji: newOptions[index]?.emoji || "",
                                      description: newOptions[index]?.description || ""
                                    };
                                    field.onChange(newOptions);
                                  }}
                                  placeholder="e.g., Create Support Ticket"
                                  disabled={!form.watch("enabled")}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-sm font-medium">Emoji</label>
                                  <Input
                                    value={option.emoji || ""}
                                    onChange={(e) => {
                                      const newOptions = [...field.value];
                                      newOptions[index] = {
                                        label: newOptions[index]?.label || "",
                                        emoji: e.target.value,
                                        description: newOptions[index]?.description || ""
                                      };
                                      field.onChange(newOptions);
                                    }}
                                    placeholder="e.g., 🎫"
                                    maxLength={32}
                                    disabled={!form.watch("enabled")}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Description</label>
                                  <Input
                                    value={option.description || ""}
                                    onChange={(e) => {
                                      const newOptions = [...field.value];
                                      newOptions[index] = {
                                        label: newOptions[index]?.label || "",
                                        emoji: newOptions[index]?.emoji || "",
                                        description: e.target.value
                                      };
                                      field.onChange(newOptions);
                                    }}
                                    placeholder="Optional description"
                                    maxLength={100}
                                    disabled={!form.watch("enabled")}
                                  />
                                </div>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newOptions = field.value.filter((_, i) => i !== index);
                                field.onChange(newOptions);
                              }}
                              disabled={!form.watch("enabled") || field.value.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <FormDescription>
                      Configure up to 25 context menu options that users can choose from
                    </FormDescription>
                    <FormMessage />
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