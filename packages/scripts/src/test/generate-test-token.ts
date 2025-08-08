#!/usr/bin/env tsx
/**
 * Generate Test Authentication Token
 * Creates a test session token for API testing
 *
 * Usage:
 *   pnpm test:token              # From root directory
 *   pnpm exec ticketsbot-test-token  # Direct execution
 */

import { prisma } from "@ticketsbot/db";

// Get API URL from environment or use default
const API_URL = process.env.API_URL || "http://localhost:3001";

async function generateTestToken() {
  console.log("🔑 Generating Test Authentication Token...\n");

  try {
    // Find a test user from seed data
    const testUser = await prisma.user.findFirst({
      where: {
        email: {
          contains: "ticketsbot.test",
        },
      },
      include: {
        sessions: {
          where: {
            expiresAt: {
              gt: new Date(),
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    if (!testUser) {
      console.error("❌ No test user found. Please run the seed script first:");
      console.error("   pnpm --filter @ticketsbot/core db:seed");
      process.exit(1);
    }

    console.log(
      `Found test user: ${testUser.email} (Discord ID: ${testUser.discordUserId || "not linked"})`
    );

    if (testUser.sessions.length > 0) {
      const session = testUser.sessions[0];
      if (session) {
        console.log("\n✅ Active session found!");
        console.log(`Token: ${session.token}`);
        console.log(`Expires: ${session.expiresAt.toISOString()}`);

        console.log("\n📝 Add to your .env file:");
        console.log(`TEST_USER_TOKEN=${session.token}`);

        console.log("\n🧪 Test with:");
        console.log(`curl -H "Authorization: Bearer ${session.token}" ${API_URL}/health`);
      }
    } else {
      console.log("\n⚠️  No active session found for test user.");
      console.log("Please log in through the web UI first to create a session.");
      console.log("\nAlternatively, you can create a session manually:");

      // Generate a test token
      const token = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      console.log("\nCreating test session...");
      const session = await prisma.session.create({
        data: {
          token,
          userId: testUser.id,
          ipAddress: "127.0.0.1",
          userAgent: "Test Script",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      console.log("\n✅ Test session created!");
      console.log(`Token: ${session.token}`);
      console.log(`Expires: ${session.expiresAt.toISOString()}`);

      console.log("\n📝 Add to your .env file:");
      console.log(`TEST_USER_TOKEN=${session.token}`);

      console.log("\n🧪 Test with:");
      console.log(`curl -H "Authorization: Bearer ${session.token}" ${API_URL}/health`);
    }

    // Show available test guild if set
    if (process.env.DEV_GUILD_ID) {
      console.log("\n🏠 Test guild configured:");
      console.log(`  - Guild ID: ${process.env.DEV_GUILD_ID}`);
      console.log("\n📝 Add to your .env file:");
      console.log(`TEST_GUILD_ID=${process.env.DEV_GUILD_ID}`);
    }

    console.log("\n📍 Using API URL:", API_URL);
  } catch (error) {
    console.error("❌ Error generating test token:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateTestToken().catch(console.error);
