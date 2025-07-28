import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Load environment variables from root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "../../..");
const envPath = resolve(rootDir, ".env");

const result = config({ path: envPath });

if (result.error) {
  console.error("❌ Failed to load .env file:", result.error);
  process.exit(1);
}