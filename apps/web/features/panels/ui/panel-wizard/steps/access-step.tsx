import React from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import type { FlattenedPanelFormData } from "../../types";

interface DiscordRole {
  id: string;
  name: string;
  color?: string;
  position?: number;
}

interface AccessStepProps {
  formData: FlattenedPanelFormData;
  onFieldChange: <K extends keyof FlattenedPanelFormData>(
    field: K,
    value: FlattenedPanelFormData[K]
  ) => void;
  discordRoles: DiscordRole[] | undefined;
  rolesLoading: boolean;
}

export default function AccessStep({
  formData,
  onFieldChange,
  discordRoles,
  rolesLoading,
}: AccessStepProps) {
  const allowedRoles = formData.allowedRoles
    ? formData.allowedRoles.split(",").filter(Boolean)
    : [];
  const blockedRoles = formData.blockedRoles
    ? formData.blockedRoles.split(",").filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-1 text-lg font-semibold text-gray-900">Access Control</h3>
        <p className="text-sm text-gray-500">Configure who can open tickets through this panel</p>
      </div>

      {/* Allowed Roles */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Allowed Roles</label>
        <p className="mb-3 text-xs text-gray-500">
          Only users with these roles can open tickets. Leave empty to allow everyone.
        </p>
        <MultiSelect
          options={
            discordRoles?.map((role) => ({
              value: role.id,
              label: role.name,
            })) || []
          }
          selected={allowedRoles}
          onChange={(selected) => {
            onFieldChange("allowedRoles", selected.join(","));
          }}
          placeholder={
            rolesLoading
              ? "Loading roles..."
              : allowedRoles.length === 0
                ? "Everyone can open tickets"
                : "Select roles..."
          }
          disabled={rolesLoading}
        />
      </div>

      {/* Blocked Roles */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Blocked Roles</label>
        <p className="mb-3 text-xs text-gray-500">
          Users with these roles cannot open tickets, even if they have an allowed role.
        </p>
        <MultiSelect
          options={
            discordRoles?.map((role) => ({
              value: role.id,
              label: role.name,
            })) || []
          }
          selected={blockedRoles}
          onChange={(selected) => {
            onFieldChange("blockedRoles", selected.join(","));
          }}
          placeholder={
            rolesLoading
              ? "Loading roles..."
              : blockedRoles.length === 0
                ? "No roles blocked"
                : "Select roles..."
          }
          disabled={rolesLoading}
        />
      </div>

      {/* Access Summary */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="mb-2 text-sm font-medium text-gray-700">Access Summary</h4>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-start gap-2">
            <span className="font-medium">Who can open tickets:</span>
            <span>
              {allowedRoles.length === 0
                ? "Everyone"
                : `Only users with: ${allowedRoles
                    .map((roleId: string) => {
                      const role = discordRoles?.find((r) => r.id === roleId);
                      return role ? `@${role.name}` : roleId;
                    })
                    .join(", ")}`}
            </span>
          </div>
          {blockedRoles.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="font-medium">Blocked:</span>
              <span>
                {blockedRoles
                  .map((roleId: string) => {
                    const role = discordRoles?.find((r) => r.id === roleId);
                    return role ? `@${role.name}` : roleId;
                  })
                  .join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h4 className="mb-2 text-sm font-medium text-blue-900">Access Control Tips</h4>
        <ul className="space-y-1 text-xs text-blue-700">
          <li>• Leave "Allowed Roles" empty to let everyone open tickets</li>
          <li>• Blocked roles take priority over allowed roles</li>
          <li>• Use this to create VIP-only or member-only support panels</li>
          <li>• Consider creating separate panels for different user groups</li>
        </ul>
      </div>
    </div>
  );
}
