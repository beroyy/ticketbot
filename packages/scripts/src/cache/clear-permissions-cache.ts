#!/usr/bin/env tsx
/**
 * Clear all permissions cache entries from Redis
 * This is useful after fixing cache implementation issues
 */

import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

async function clearPermissionsCache() {
  const client = createClient({ url: REDIS_URL });
  
  try {
    await client.connect();
    console.log("Connected to Redis");
    
    // Find all permission keys (only pattern we use now)
    const pattern = "perms:*";
    const keys = [];
    
    console.log(`\nScanning for ${pattern}...`);
    
    for await (const keyBatch of client.scanIterator({
      MATCH: pattern,
      COUNT: 100
    })) {
      for (const key of keyBatch) {
        if (key && key !== '') {
          keys.push(key);
        }
      }
    }
    
    console.log(`Found ${keys.length} permission cache keys`);
    
    if (keys.length > 0) {
      // Show some examples
      console.log("\nExample keys:");
      keys.slice(0, 5).forEach(key => console.log(`  - ${key}`));
      if (keys.length > 5) {
        console.log(`  ... and ${keys.length - 5} more`);
      }
      
      // Delete all keys
      console.log(`\nDeleting ${keys.length} permission cache keys...`);
      await client.del(...keys);
      console.log("✅ All permission cache keys deleted");
    } else {
      console.log("No permission cache keys found");
    }
    
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await client.quit();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  clearPermissionsCache();
}