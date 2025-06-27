// setupTestDB.ts
import { execSync } from "child_process";

module.exports = async () => {
  execSync("npx prisma migrate reset --force --skip-generate --skip-seed", {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://weatheruser:weatherpass@db:5432/weatherdb_test"
    }
  });
};
