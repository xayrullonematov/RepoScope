process.env.DATABASE_URL = "file:./test.db";

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    // Every integration test uses the same SQLite file. Serial files prevent
    // cross-suite cleanup and queue-worker writes from contending for it.
    fileParallelism: false,
    setupFiles: ["./vitest.setup.ts"],
  },
});
