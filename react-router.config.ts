import type { Config } from "@react-router/dev/config";

const siteHost = process.env.SITE_NAME
  ? new URL(process.env.SITE_NAME).host
  : undefined;

export default {
  prerender: ["/"],
  allowedActionOrigins: [...(siteHost ? [siteHost] : [])],
  future: {
    // These flags are retained for the planned React Router upgrade.
    v8_splitRouteModules: true,
    v8_viteEnvironmentApi: true,
  },
} satisfies Config;
