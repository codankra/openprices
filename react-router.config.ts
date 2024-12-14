import type { Config } from "@react-router/dev/config";

export default {
  prerender: ["/", "/product/1", "/product/2", "/product/5", "/product/6"],
} satisfies Config;
