import { main } from "./seeders/index";

// Execute the seeder orchestrator
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
}
