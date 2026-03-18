"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const config_1 = require("@prisma/config");
const url = process.env.DATABASE_URL || "postgresql://orchestrator:secretpassword@127.0.0.1:5432/appsec?schema=public";
exports.default = (0, config_1.defineConfig)({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url,
    },
});
//# sourceMappingURL=prisma.config.js.map