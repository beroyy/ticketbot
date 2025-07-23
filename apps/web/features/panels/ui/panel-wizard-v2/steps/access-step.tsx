import React from "react";
import type { UseFormReturn } from "react-hook-form";
import { SwitchField, SelectField } from "@/components/forms/form-fields";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useDiscordRoles } from "@/features/user/queries";
import { useSelectServer } from "@/features/user/ui/select-server-provider";
import { MultiSelect } from "@/components/ui/multi-select";
import type { PanelFormData } from "../../../schemas/panel-form-schema";

interface AccessStepProps {
  form: UseFormReturn<PanelFormData>;
}

export function AccessStep({ form }: AccessStepProps) {
  const { selectedGuildId } = useSelectServer();
  const { data: discordRoles = [], isLoading: rolesLoading } = useDiscordRoles(selectedGuildId);

  const allowEveryone = form.watch("accessControl.allowEveryone");
  const selectedRoles = form.watch("accessControl.roles") || [];
  const mentionRoles = form.watch("mentionOnOpen") || "";

  const roleOptions = discordRoles.map((role) => ({
    label: role.name,
    value: role.id || "",
    color: role.color,
  }));

  const mentionOptions = [
    { label: "@here", value: "@here" },
    { label: "@everyone", value: "@everyone" },
    ...roleOptions,
  ];

  return (
    <div className="space-y-6">
      {/* Access Control */}
      <div>
        <h3 className="mb-4 text-lg font-medium">Access Control</h3>
        <p className="text-muted-foreground mb-6 text-sm">
          Control who can create tickets using this panel
        </p>

        <div className="space-y-4">
          <SwitchField
            name="accessControl.allowEveryone"
            label="Allow Everyone"
            description="Allow all server members to create tickets"
          />

          {!allowEveryone && (
            <FormField
              control={form.control}
              name="accessControl.roles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allowed Roles</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={roleOptions}
                      selected={field.value}
                      onChange={field.onChange}
                      placeholder="Select roles..."
                      disabled={rolesLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    Only members with these roles can create tickets
                  </FormDescription>
                </FormItem>
              )}
            />
          )}

          {selectedRoles.length > 0 && !allowEveryone && (
            <div className="flex flex-wrap gap-2">
              {selectedRoles.map((roleId) => {
                const role = discordRoles.find((r) => r.id === roleId);
                return role ? (
                  <Badge key={roleId} variant="secondary">
                    {role.name}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-auto p-0"
                      onClick={() => {
                        form.setValue(
                          "accessControl.roles",
                          selectedRoles.filter((id) => id !== roleId)
                        );
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mentions */}
      <div>
        <h3 className="mb-4 text-lg font-medium">Mentions</h3>
        <p className="text-muted-foreground mb-6 text-sm">
          Configure who gets mentioned when tickets are created
        </p>

        <div className="space-y-4">
          <SelectField
            name="mentionOnOpen"
            label="Mention on Ticket Creation"
            description="Role or user group to mention when a ticket is created"
            placeholder="Select who to mention..."
            options={mentionOptions}
          />

          <SwitchField
            name="hideMentions"
            label="Hide Mentions"
            description="Hide the mention from the ticket opener (staff will still be notified)"
          />
        </div>
      </div>

      {/* Advanced Settings */}
      <div>
        <h3 className="mb-4 text-lg font-medium">Advanced Settings</h3>
        <div className="space-y-4">
          <SelectField
            name="categoryId"
            label="Ticket Category"
            description="Discord category where ticket channels will be created"
            placeholder="Select a category..."
            options={[]} // TODO: Fetch category channels
          />

          <SwitchField
            name="namingScheme"
            label="Custom Naming Scheme"
            description="Use a custom naming scheme for ticket channels"
          />
        </div>
      </div>
    </div>
  );
}
