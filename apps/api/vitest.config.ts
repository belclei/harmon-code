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
    //
    // `fileParallelism: false` alone was not enough (found Sprint 10, growing
    // the suite past ~180 tests made the flakiness reproducible): Vitest's
    // default `forks` pool still spawns multiple worker processes and only
    // schedules *files* onto them one at a time, which still let two worker
    // processes hold live connections into the same shared Postgres/Redis
    // concurrently across a file boundary. Pinning to a single fork removes
    // the worker-process boundary entirely — confirmed fixing an
    // intermittent ~15% test failure rate (500s/401s/wrong-array-length,
    // never the same tests twice) that individual per-file runs never showed.
    fileParallelism: false,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
