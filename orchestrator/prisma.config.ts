import "dotenv/config";
import { defineConfig } from "@prisma/config";

// Force load to verify
const url = process.env.DATABASE_URL || "postgresql://orchestrator:secretpassword@127.0.0.1:5432/appsec?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url,
  },
});
