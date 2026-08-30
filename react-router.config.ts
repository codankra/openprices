import type { Config } from "@react-router/dev/config";
export default {
  prerender: ["/"],
  future: {
    // These flags are retained for the planned React Router upgrade.
    v8_splitRouteModules: true,
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
