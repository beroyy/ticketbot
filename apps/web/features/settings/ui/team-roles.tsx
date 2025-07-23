import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search, Filter, Plus, ChevronRight } from "lucide-react";
import AddMemberModal from "./add-member-modal";
import EditMemberModal from "./edit-member-modal";
import { useTeamRoles, useAddRoleMember, useRemoveRoleMember } from "@/features/settings/queries";
import type { TeamRole, TeamRoleMember } from "@/features/settings/types";
import { useSelectServer } from "@/features/user/ui/select-server-provider";
import { RiDeleteBin4Line, RiEditLine } from "react-icons/ri";
import { useTeamSearch, useSettingsActions } from "@/shared/stores/app-store";
import { usePermissions, PermissionFlags } from "@/features/permissions/hooks/use-permissions";

export default function TeamRoles() {
  // Get current guild
  const { selectedGuildId } = useSelectServer();
  const { hasPermission } = usePermissions();

  // Fetch team roles
  const {
    data: rolesData,
    isLoading,
    error,
  } = useTeamRoles(selectedGuildId) as {
    data: { roles: TeamRole[] } | undefined;
    isLoading: boolean;
    error: Error | null;
  };

  // Mutations
  const addRoleMemberMutation = useAddRoleMember();
  const removeRoleMemberMutation = useRemoveRoleMember();

  // Modal States
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<TeamRole | null>(null);
  const [editingMember, setEditingMember] = useState<(TeamRoleMember & { role: TeamRole }) | null>(
    null
  );
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [editMemberError, setEditMemberError] = useState<string | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<Set<number>>(new Set());

  // Get team roles from data
  const teamRoles = useMemo(() => rolesData?.roles || [], [rolesData?.roles]);

  // Get all members from all roles for search
  const allMembers = useMemo(() => {
    const members: (TeamRoleMember & { role: TeamRole })[] = [];
    teamRoles.forEach((role) => {
      if (role.members) {
        role.members.forEach((member) => {
          members.push({ ...member, role });
        });
      }
    });
    return members;
  }, [teamRoles]);

  // Search functionality from global store
  const searchQuery = useTeamSearch();
  const { setTeamSearch } = useSettingsActions();

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return allMembers.filter((member) => {
      const displayName = member.user?.displayName?.toLowerCase() || "";
      const username = member.user?.username?.toLowerCase() || "";
      const discordId = member.discordId.toLowerCase();
      const roleName = member.role.name.toLowerCase();

      return (
        displayName.includes(query) ||
        username.includes(query) ||
        discordId.includes(query) ||
        roleName.includes(query)
      );
    });
  }, [allMembers, searchQuery]);

  const toggleRoleExpansion = (roleId: number) => {
    setExpandedRoles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const handleAddMember = async (memberDiscordId: string, selectedRoleId: number) => {
    if (!selectedGuildId || !memberDiscordId.trim()) {
      setAddMemberError("Discord ID is required");
      return;
    }

    // Basic Discord ID validation (should be numeric and 17-19 digits)
    const discordIdPattern = /^\d{17,19}$/;
    if (!discordIdPattern.test(memberDiscordId.trim())) {
      setAddMemberError("Please enter a valid Discord ID (17-19 digit number)");
      return;
    }

    setAddMemberError(null);
    setIsAddingMember(true);
    try {
      await addRoleMemberMutation.mutateAsync({
        guildId: selectedGuildId,
        roleId: selectedRoleId.toString(),
        userId: memberDiscordId.trim(),
      });

      setAddMemberError(null);
      setShowAddMemberModal(false);
      setSelectedRole(null);
    } catch (error) {
      console.error("Failed to add role member:", error);
      setAddMemberError(error instanceof Error ? error.message : "Failed to add role member");
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (roleId: number, discordId: string) => {
    if (!selectedGuildId) return;

    try {
      await removeRoleMemberMutation.mutateAsync({
        guildId: selectedGuildId,
        roleId: roleId.toString(),
        userId: discordId,
      });
    } catch (error) {
      console.error("Failed to remove role member:", error);
    }
  };

  const handleEditMember = (member: TeamRoleMember & { role: TeamRole }) => {
    setEditingMember(member);
    setEditMemberError(null);
    setShowEditMemberModal(true);
  };

  const handleUpdateMember = async (newRoleId: number) => {
    if (!selectedGuildId || !editingMember) {
      setEditMemberError("Unable to update member");
      return;
    }

    setEditMemberError(null);
    setIsEditingMember(true);
    try {
      // Remove from old role
      await removeRoleMemberMutation.mutateAsync({
        guildId: selectedGuildId,
        roleId: editingMember.role.id.toString(),
        userId: editingMember.discordId,
      });

      // Add to new role
      await addRoleMemberMutation.mutateAsync({
        guildId: selectedGuildId,
        roleId: newRoleId.toString(),
        userId: editingMember.discordId,
      });

      setEditingMember(null);
      setEditMemberError(null);
      setShowEditMemberModal(false);
    } catch (error) {
      console.error("Failed to update member role:", error);
      setEditMemberError(error instanceof Error ? error.message : "Failed to update member role");
    } finally {
      setIsEditingMember(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center text-gray-500">Loading team roles...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="text-center text-red-500">Failed to load team roles</div>
      </div>
    );
  }

  return (
    <>
      <div className="nice-gray-border mx-auto mt-9 rounded-xl bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="mb-1 text-lg font-semibold text-gray-900">Team Roles</h2>
              <p className="text-sm text-gray-600">Manage team roles and their members</p>
            </div>
            {hasPermission(PermissionFlags.ROLE_ASSIGN) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRole(
                    teamRoles.find((r) => r.name === "support") || teamRoles[0] || null
                  );
                  setShowAddMemberModal(true);
                }}
                className="flex items-center gap-2 rounded-xl border-[#103A71] bg-[#EBF1FF] font-medium text-[#103A71]"
              >
                <Plus className="size-4" />
                Add New Member
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="border-b border-gray-200 bg-gray-50 p-6">
          <div className="flex items-center gap-4">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => {
                  setTeamSearch(e.target.value);
                }}
                className="border-gray-300 pl-10"
              />
            </div>
            <Button variant="outline" className="border-gray-300">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" className="border-gray-300">
              Sort by
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Roles and Members */}
        <div className="divide-y divide-gray-200">
          {searchQuery.trim() ? (
            // Search Results View
            <div className="p-6">
              <h3 className="mb-4 text-sm font-medium text-gray-700">
                Search Results ({filteredMembers.length})
              </h3>
              {filteredMembers.length === 0 ? (
                <p className="py-8 text-center text-gray-500">
                  No members found matching &ldquo;{searchQuery}&rdquo;
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredMembers.map((member) => (
                    <div
                      key={`${String(member.role.id)}-${String(member.id)}`}
                      className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                    >
                      <div className="flex items-center">
                        <Image
                          width={40}
                          height={40}
                          src={
                            member.user?.avatarUrl ||
                            `https://cdn.discordapp.com/embed/avatars/${String(
                              parseInt(member.discordId) % 5
                            )}.png`
                          }
                          alt={member.user?.displayName || member.discordId}
                          className="mr-3 h-10 w-10 rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://cdn.discordapp.com/embed/avatars/${String(
                              parseInt(member.discordId) % 5
                            )}.png`;
                          }}
                        />
                        <div>
                          <span className="font-medium text-gray-900">
                            {member.user?.displayName || member.user?.username || "Unknown User"}
                          </span>
                          <span className="ml-2 text-sm text-gray-500">
                            @{member.user?.username || member.discordId}
                          </span>
                          <span
                            className={`ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              member.role.name === "admin"
                                ? "bg-blue-100 text-blue-800"
                                : member.role.name === "support"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {member.role.name.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPermission(PermissionFlags.ROLE_ASSIGN) && (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => {
                                handleEditMember(member);
                              }}
                              className="nice-gray-border rounded-lg px-2 font-medium text-[#525866]"
                            >
                              <RiEditLine className="size-4" />
                              <span>Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                void handleRemoveMember(member.role.id, member.discordId);
                              }}
                              className="nice-gray-border rounded-lg px-2 font-medium text-[#525866]"
                            >
                              <RiDeleteBin4Line className="size-4" />
                              <span>Remove</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Roles View
            teamRoles.map((role) => (
              <div key={role.id}>
                <div
                  className="cursor-pointer p-6 hover:bg-gray-50"
                  onClick={() => {
                    toggleRoleExpansion(role.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronRight
                        className={`h-5 w-5 text-gray-400 transition-transform ${
                          expandedRoles.has(role.id) ? "rotate-90" : ""
                        }`}
                      />
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                          {role.isDefault && (
                            <span className="ml-2 text-xs text-gray-500">(Default)</span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {role.memberCount} member{role.memberCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      {hasPermission(PermissionFlags.ROLE_ASSIGN) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRole(role);
                            setShowAddMemberModal(true);
                          }}
                          className="text-[#103A71]"
                        >
                          <Plus className="mr-1 h-4 w-4" />
                          Add Member
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {expandedRoles.has(role.id) && role.members && role.members.length > 0 && (
                  <div className="bg-gray-50 px-6 pb-6">
                    <div className="space-y-3 pt-3">
                      {role.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4"
                        >
                          <div className="flex items-center">
                            <Image
                              width={40}
                              height={40}
                              src={
                                member.user?.avatarUrl ||
                                `https://cdn.discordapp.com/embed/avatars/${String(
                                  parseInt(member.discordId) % 5
                                )}.png`
                              }
                              alt={member.user?.displayName || member.discordId}
                              className="mr-3 h-10 w-10 rounded-full"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://cdn.discordapp.com/embed/avatars/${String(
                                  parseInt(member.discordId) % 5
                                )}.png`;
                              }}
                            />
                            <div>
                              <span className="font-medium text-gray-900">
                                {member.user?.displayName ||
                                  member.user?.username ||
                                  "Unknown User"}
                              </span>
                              <span className="ml-2 text-sm text-gray-500">
                                @{member.user?.username || member.discordId}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasPermission(PermissionFlags.ROLE_ASSIGN) && (
                              <>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    handleEditMember({ ...member, role });
                                  }}
                                  className="nice-gray-border rounded-lg px-2 font-medium text-[#525866]"
                                >
                                  <RiEditLine className="size-4" />
                                  <span>Edit</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    void handleRemoveMember(role.id, member.discordId);
                                  }}
                                  className="nice-gray-border rounded-lg px-2 font-medium text-[#525866]"
                                >
                                  <RiDeleteBin4Line className="size-4" />
                                  <span>Remove</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => {
          setShowAddMemberModal(false);
          setSelectedRole(null);
        }}
        onAddMember={handleAddMember}
        roles={teamRoles}
        selectedRole={selectedRole}
        isAddingMember={isAddingMember}
        addMemberError={addMemberError}
      />

      <EditMemberModal
        isOpen={showEditMemberModal}
        onClose={() => {
          setShowEditMemberModal(false);
          setEditingMember(null);
        }}
        onUpdateMember={handleUpdateMember}
        member={editingMember}
        currentRole={editingMember?.role || null}
        roles={teamRoles}
        isEditingMember={isEditingMember}
        editMemberError={editMemberError}
      />
    </>
  );
}
