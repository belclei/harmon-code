/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "core-no-io",
      comment:
        "packages/core is a pure deterministic module: only packages/domain may be imported. No cross-package imports (other than domain) and no npm-installed I/O libraries (Prisma, undici, node-fetch, etc.).",
      severity: "error",
      from: { path: "^packages/core" },
      to: {
        path: "^(packages/(?!domain)|node_modules/(@prisma|prisma|undici|node-fetch|cross-fetch))",
        pathNot: "^packages/core",
      },
    },
    {
      name: "core-no-node-builtins",
      comment:
        // ⚠ Node built-ins (fs, http, https, net, child_process, dns, os, ...) resolve to a bare
        // module name (e.g. "fs"), NOT a "node_modules/..." path, so the core-no-io rule above
        // (which is path-prefix based) does not match them. This is a distinct rule using
        // dependencyTypes:["core"], which is how dependency-cruiser actually classifies Node
        // built-ins. Verified: without this rule, `import { readFileSync } from "fs"` inside
        // packages/core passed `npm run boundaries` silently — a real gap in the original
        // skeleton rule, caught while implementing US-1.1/US-1.4.
        "packages/core must never import a Node built-in module (fs, http, net, child_process, ...) — those are I/O/environment sources.",
      severity: "error",
      from: { path: "^packages/core" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "web-no-prisma",
      comment:
        "apps/web must never import Prisma or the db package's internals directly.",
      severity: "error",
      from: { path: "^apps/web" },
      to: {
        path: "^(node_modules/@prisma|node_modules/prisma|packages/db/src/generated)",
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" },
  },
};
