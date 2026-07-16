import type { Config } from "@react-router/dev/config";
export default {
  prerender: ["/"],
  future: {
    v8_splitRouteModules: true,
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
