# Complete Migration to 3-Role System

## Current State
- Hybrid system with both old permissions (bitfields) and new roles (owner/admin/support)
- New `role` field added to GuildRoleMember
- Permission model deleted (was unused)
- Better Auth organization plugin not used due to CLI limitations

## Phase 1: Database Cleanup
1. **Remove permission fields from schema.prisma**
   - Remove `permissions BigInt` from GuildRole model
   - Delete entire GuildMemberPermission model
   - Remove relation references to GuildMemberPermission from Guild and DiscordUser

2. **Generate & migrate**
   - Run `prisma generate` to update client
   - Create migration to drop columns/tables

## Phase 2: Remove Permission System Code
1. **Auth Package (`packages/auth/src/`)**
   - Delete `services/permissions.ts` entirely
   - Remove PermissionFlags exports from `index.ts`
   - Update `services/roles.ts` to remove RolePermissions mapping

2. **DB Package (`packages/db/src/operations/role/`)**
   - Remove `hasPermission()`, `hasAnyPermission()` from queries.ts
   - Remove `getUserPermissions()`, update `ensureDefaultRoles()`
   - Simplify to only manage role assignments

## Phase 3: Update Middleware & Hooks
1. **API Middleware (`apps/api/src/middleware/permissions.ts`)**
   - Delete `requirePermission()`, `requireAnyPermission()`
   - Remove legacy permission fallbacks from all functions
   - Keep only `requireRole()` and `validateSession()`

2. **Web Hooks (`apps/web/features/permissions/`)**
   - Remove permission bitfield logic from `use-permissions.ts`
   - Delete `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`
   - Keep only role-based checks

## Phase 4: Simplify Role Logic
1. **Role Service (`packages/auth/src/services/roles.ts`)**
   - Remove RolePermissions bitfield mappings
   - Remove `getRolePermissions()`, `getUserPermissionsFromRole()`
   - Remove `hasPermissionViaRole()` compatibility layer

2. **Clean up GuildRole usage**
   - GuildRole now only tracks Discord roles
   - App permissions determined solely by `role` field value

## Phase 5: Final Cleanup
1. **Remove permission references**
   - Search & remove any remaining PermissionFlags usage
   - Update any permission-based UI components
   - Clean up permission-related types/interfaces

2. **Test & Verify**
   - Ensure all auth checks use role-based system
   - Verify owner/admin/support roles work correctly
   - Run full typecheck across all packages

## Files to Delete
- `packages/auth/src/services/permissions.ts`
- Any permission-related test files

## Models to Remove
- `GuildMemberPermission` model
- `permissions` field from `GuildRole`

## Functions to Delete
- `hasPermission()`, `hasAnyPermission()`, `getUserPermissions()`
- `requirePermission()`, `requireAnyPermission()`
- `getRolePermissions()`, `getUserPermissionsFromRole()`, `hasPermissionViaRole()`

## Result
- Clean, simple 3-role authorization system
- No more bitfield calculations
- Straightforward role checks: owner > admin > support
- Easier to understand and maintain