import type { Config } from "@react-router/dev/config";

const siteHost = process.env.SITE_NAME
  ? new URL(process.env.SITE_NAME).host
  : undefined;

export default {
  prerender: ["/"],
  allowedActionOrigins: [...(siteHost ? [siteHost] : [])],
  splitRouteModules: true,
} satisfies Config;
