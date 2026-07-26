// apps/api/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 15000,
    // Integration tests share one real Postgres/Redis instance, and
    // `resetTestDb` truncates the whole DB after every test (not scoped to
    // the calling file) — running test files concurrently lets one file's
    // teardown wipe fixtures another file is mid-test with. Sequential file
    // execution is the correct fix, not a workaround: these are integration
    // tests against shared external state, not pure unit tests.
    fileParallelism: false,
  },
});
