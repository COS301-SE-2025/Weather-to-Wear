// setupTestDB.ts
import { execSync } from "child_process";

module.exports = async () => {
  execSync("npx prisma migrate reset --force --skip-generate --skip-seed", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://weatheruser:weatherpass@localhost:5434/weatherdb_test"
    }
  });
};
