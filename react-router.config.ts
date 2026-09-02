import type { Config } from "@react-router/dev/config";

const siteHost = process.env.SITE_NAME
  ? new URL(process.env.SITE_NAME).host
  : undefined;
const allowedActionOrigins = [
  "openpricedata.com",
  ...(siteHost ? [siteHost] : []),
];

export default {
  prerender: ["/"],
  allowedActionOrigins,
  splitRouteModules: true,
} satisfies Config;
