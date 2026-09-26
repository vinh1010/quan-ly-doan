import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/__tests__/**/*.test.ts"],
    setupFiles: ["src/__tests__/setup.ts"],
    testTimeout: 15000,
    hookTimeout: 20000,
    // các file test dùng chung 1 CSDL nên chạy tuần tự, tránh đụng dữ liệu của nhau
    fileParallelism: false,
  },
});
