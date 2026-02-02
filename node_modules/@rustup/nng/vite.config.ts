import { defineConfig } from "vite";

export default defineConfig({
    root: __dirname,
    test: {
        globals: true,
        environment: "node",
        include: ["test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
        reporters: ["default"],
        coverage: {
            reportsDirectory: "./coverage",
            provider: "v8",
        },
    },
});
