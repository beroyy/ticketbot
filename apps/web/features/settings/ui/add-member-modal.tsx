import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalHeader, ModalContent, ModalCloseButton } from "@/components/ui/modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User, Plus, HelpCircle, Loader2, UserPlus } from "lucide-react";

import type { TeamRole } from "@/features/settings/types";

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMember: (discordId: string, roleId: number) => Promise<void>;
  roles: TeamRole[];
  selectedRole: TeamRole | null;
  isAddingMember: boolean;
  addMemberError: string | null;
}

export default function AddMemberModal({
  isOpen,
  onClose,
  onAddMember,
  roles,
  selectedRole: initialRole,
  isAddingMember,
  addMemberError,
}: AddMemberModalProps) {
  const [selectedRole, setSelectedRole] = useState<TeamRole | null>(initialRole);
  const [memberDiscordId, setMemberDiscordId] = useState("");

  // Update selected role when initialRole changes
  useEffect(() => {
    if (initialRole) {
      setSelectedRole(initialRole);
    }
  }, [initialRole]);

  const handleSubmit = async () => {
    if (!selectedRole) return;
    await onAddMember(memberDiscordId, selectedRole.id);
  };

  const handleClose = () => {
    setMemberDiscordId("");
    setSelectedRole(roles.find((r) => r.name === "admin") || roles[0] || null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalHeader>
        <h2 className="text-lg font-semibold text-gray-900">Add New Member</h2>
        <ModalCloseButton onClose={handleClose} />
      </ModalHeader>

      <ModalContent>
        <div className="space-y-6">
          {/* Select Team */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Select Role</label>
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between border-gray-300 text-left"
                >
                  {selectedRole
                    ? selectedRole.name.charAt(0).toUpperCase() + selectedRole.name.slice(1)
                    : "Select Role"}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-full">
                {roles.map((role) => (
                  <DropdownMenuItem
                    key={role.id}
                    onSelect={() => {
                      setSelectedRole(role);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <span>{role.name.charAt(0).toUpperCase() + role.name.slice(1)}</span>
                      {role.isDefault && <span className="text-xs text-gray-500">(Default)</span>}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Create New Role Button */}
            <Button
              variant="outline"
              className="mt-3 w-full border-dashed border-gray-300 text-blue-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Role
            </Button>
          </div>

          {/* Discord ID */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Discord ID</label>
              <HelpCircle className="h-4 w-4 text-gray-400" />
            </div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="123456789012345678"
                value={memberDiscordId}
                onChange={(e) => {
                  setMemberDiscordId(e.target.value);
                }}
                className="border-gray-300 pl-10"
              />
            </div>
          </div>

          {/* Error Display */}
          {addMemberError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="text-sm text-red-600">{addMemberError}</div>
            </div>
          )}

          {/* Add Member Button */}
          <Button
            className="mt-6 w-full bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={isAddingMember || !memberDiscordId.trim() || !selectedRole}
          >
            {isAddingMember ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {isAddingMember ? "Adding..." : "Add Member"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
