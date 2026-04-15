import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { hostname: "dgsoft.b-cdn.net" },
    ],
  },
  serverExternalPackages: ["@prisma/client"],
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  allowedDevOrigins: ["84.254.60.118"],
  // TODO: incremental cleanup — re-enable strict TS once type debt is paid off
  typescript: { ignoreBuildErrors: true },
};

export default withNextIntl(nextConfig);
