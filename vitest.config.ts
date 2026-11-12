import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/rental/**/*.test.ts", "src/utils/**/*.test.ts", "src/floorplan/**/*.test.ts"],
  },
});
