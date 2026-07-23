/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "core-no-io",
      comment:
        "packages/core is a pure deterministic module: only packages/domain may be imported. No Prisma, no fetch, no fs, no Date.now() sources.",
      severity: "error",
      from: { path: "^packages/core" },
      to: {
        path: "^(packages/(?!domain)|node_modules/(@prisma|prisma|undici))",
        pathNot: "^packages/core"
      }
    },
    {
      name: "web-no-prisma",
      comment: "apps/web must never import Prisma or the db package's internals directly.",
      severity: "error",
      from: { path: "^apps/web" },
      to: { path: "^(node_modules/@prisma|node_modules/prisma|packages/db/src/generated)" }
    }
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" }
  }
};
