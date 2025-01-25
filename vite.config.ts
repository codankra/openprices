import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    allowedHosts: [process.env.SITE_NAME!.replace(/^https?:\/\//, "")],
    port: 3000,
  },
  css: {
    modules: {
      localsConvention: "camelCaseOnly",
    },
  },
  plugins: [reactRouter(), tsconfigPaths()],
});
