#!/usr/bin/env tsx
/**
 * Debug script to check guild ownership
 */

import { prisma } from "@ticketsbot/core";

const guildId = process.argv[2] || "1396589712545939606";
const userId = process.argv[3] || "1375520307053334528";

async function checkGuildOwner() {
  console.log(`\nChecking guild ownership for:`);
  console.log(`- Guild ID: ${guildId}`);
  console.log(`- User ID: ${userId}`);
  
  // Get guild info
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    select: {
      id: true,
      name: true,
      ownerDiscordId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  
  if (!guild) {
    console.log("\n❌ Guild not found in database!");
    return;
  }
  
  console.log("\n📊 Guild Info:");
  console.log(`- Name: ${guild.name}`);
  console.log(`- Owner Discord ID: ${guild.ownerDiscordId || "NOT SET"}`);
  console.log(`- Created: ${guild.createdAt}`);
  console.log(`- Updated: ${guild.updatedAt}`);
  
  console.log(`\n🔍 Ownership Check:`);
  console.log(`- Is user the owner? ${guild.ownerDiscordId === userId ? "YES ✅" : "NO ❌"}`);
  
  if (guild.ownerDiscordId && guild.ownerDiscordId !== userId) {
    console.log(`- Owner mismatch: DB has '${guild.ownerDiscordId}', checking for '${userId}'`);
  }
  
  // Check user's roles
  const roles = await prisma.teamRoleMember.findMany({
    where: {
      discordId: userId,
      teamRole: {
        guildId: guildId,
      },
    },
    include: {
      teamRole: true,
    },
  });
  
  console.log(`\n👥 User Roles (${roles.length}):`);
  for (const role of roles) {
    console.log(`- ${role.teamRole.name} (permissions: ${role.teamRole.permissions.toString()})`);
  }
  
  // Check if user exists
  const discordUser = await prisma.discordUser.findUnique({
    where: { id: userId },
  });
  
  console.log(`\n👤 Discord User:`);
  if (discordUser) {
    console.log(`- Username: ${discordUser.username}`);
    console.log(`- Discriminator: ${discordUser.discriminator}`);
  } else {
    console.log(`- NOT FOUND in DiscordUser table`);
  }
  
  // Check Better Auth user
  const betterAuthUsers = await prisma.user.findMany({
    where: {
      discordUserId: userId,
    },
    select: {
      id: true,
      email: true,
      discordUserId: true,
    },
  });
  
  console.log(`\n🔐 Better Auth Users (${betterAuthUsers.length}):`);
  for (const user of betterAuthUsers) {
    console.log(`- ID: ${user.id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Discord User ID: ${user.discordUserId}`);
  }
}

checkGuildOwner()
  .catch(console.error)
  .finally(() => prisma.$disconnect());