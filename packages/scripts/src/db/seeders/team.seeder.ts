import { Role } from "@ticketsbot/core/domains";
import { withTransaction } from "@ticketsbot/core/context";
import type { SeedConfig, UserWithRole } from "./types";
import { ProgressLogger } from "./utils";
import { prisma } from "@ticketsbot/db";

export class TeamSeeder {
  private logger: ProgressLogger;

  constructor(private config: SeedConfig) {
    this.logger = new ProgressLogger(config.enableProgressLogging);
  }

  async seed(guildId: string, users: UserWithRole[]): Promise<number[]> {
    this.logger.log("Creating team roles...");

    const roleIds: number[] = [];

    await withTransaction(async () => {
      // Ensure default roles exist
      await Role.ensureDefaultRoles(guildId);

      // Get the default roles
      const adminRole = await Role.getRoleByName(guildId, "admin");
      const supportRole = await Role.getRoleByName(guildId, "support");

      if (adminRole) {
        roleIds.push(adminRole.id);

        // Assign admin users to admin role
        const adminUsers = users.filter((u) => u.role === "admin");
        for (const user of adminUsers) {
          await prisma.guildRoleMember.create({
            data: {
              guildRoleId: adminRole.id,
              discordId: user.id,
            },
          });
        }
        this.logger.log(`Assigned ${adminUsers.length} users to admin role`);
      }

      if (supportRole) {
        roleIds.push(supportRole.id);

        // Assign support users to support role
        const supportUsers = users.filter((u) => u.role === "support");
        for (const user of supportUsers) {
          await prisma.guildRoleMember.create({
            data: {
              guildRoleId: supportRole.id,
              discordId: user.id,
            },
          });
        }
        this.logger.log(`Assigned ${supportUsers.length} users to support role`);
      }

      // Create additional custom roles based on environment
      const customRoleCount =
        this.config.environment === "small" ? 0 : this.config.environment === "medium" ? 1 : 2;

      for (let i = 0; i < customRoleCount; i++) {
        const roleName = i === 0 ? "moderator" : "helper";
        const role = await prisma.guildRole.create({
          data: {
            guildId,
            name: roleName,
            color: i === 0 ? "#9B59B6" : "#3498DB",
            position: 30 - i * 10,
            permissions: BigInt(i === 0 ? 0x1f0 : 0x13), // Moderate permissions for mod, basic for helper
            isDefault: false,
          },
        });

        roleIds.push(role.id);

        // Randomly assign some support users to custom roles
        const eligibleUsers = users.filter((u) => u.role === "support");
        const assignCount = Math.floor(eligibleUsers.length * 0.3);

        for (let j = 0; j < assignCount; j++) {
          const randomUser = eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)];
          if (randomUser) {
            await prisma.guildRoleMember.create({
              data: {
                guildRoleId: role.id,
                discordId: randomUser.id,
              },
            });
          }
        }
      }
    });

    this.logger.success(`Created ${roleIds.length} team roles`);
    return roleIds;
  }

  async clear(): Promise<void> {
    this.logger.log("Clearing team data...");

    await withTransaction(async () => {
      const { prisma } = await import("@ticketsbot/db");

      // Clear in correct order
      await prisma.guildRoleMember.deleteMany({});
      await prisma.guildRole.deleteMany({});
    });

    this.logger.success("Cleared team data");
  }
}
