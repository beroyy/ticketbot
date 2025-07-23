import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Modal, ModalHeader, ModalContent, ModalCloseButton } from "@/components/ui/modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, HelpCircle, Loader2, Edit } from "lucide-react";

import type { TeamRole, TeamRoleMember } from "@/features/settings/types";

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdateMember: (roleId: number) => Promise<void>;
  member: (TeamRoleMember & { role: TeamRole }) | null;
  currentRole: TeamRole | null;
  roles: TeamRole[];
  isEditingMember: boolean;
  editMemberError: string | null;
}

export default function EditMemberModal({
  isOpen,
  onClose,
  onUpdateMember,
  member,
  currentRole,
  roles,
  isEditingMember,
  editMemberError,
}: EditMemberModalProps) {
  const [selectedRole, setSelectedRole] = useState<TeamRole | null>(currentRole);

  useEffect(() => {
    if (currentRole) {
      setSelectedRole(currentRole);
    }
  }, [currentRole]);

  const handleSubmit = async () => {
    if (!selectedRole) return;
    await onUpdateMember(selectedRole.id);
  };

  const handleClose = () => {
    setSelectedRole(currentRole);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalHeader>
        <h2 className="text-lg font-semibold text-gray-900">Edit Member Role</h2>
        <ModalCloseButton onClose={handleClose} />
      </ModalHeader>

      <ModalContent>
        <div className="space-y-6">
          {/* Member Info */}
          {member && (
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center">
                <Image
                  src={
                    member.user?.avatarUrl ||
                    `https://cdn.discordapp.com/embed/avatars/${String(
                      parseInt(member.discordId) % 5
                    )}.png`
                  }
                  alt={member.user?.displayName || member.discordId}
                  className="mr-3 h-10 w-10 rounded-full"
                  width={40}
                  height={40}
                />
                <div>
                  <div className="font-medium text-gray-900">
                    {member.user?.displayName || "Unknown User"}
                  </div>
                  <div className="text-sm text-gray-600">
                    @{member.user?.username || member.discordId}
                  </div>
                </div>
              </div>
            </div>
          )}

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
          </div>

          {/* Error Display */}
          {editMemberError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="text-sm text-red-600">{editMemberError}</div>
            </div>
          )}

          {/* Update Member Button */}
          <Button
            className="mt-6 w-full bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={isEditingMember || selectedRole?.id === currentRole?.id}
          >
            {isEditingMember ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Edit className="mr-2 h-4 w-4" />
            )}
            {isEditingMember ? "Updating..." : "Update Role"}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
