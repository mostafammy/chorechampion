import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // allowedDevOrigins: ['https://6000-firebase-studio-1751655458192.cluster-ombtxv25tbd6yrjpp3lukp6zhc.cloudworkstations.dev'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
    ],
  },
  env: {
    JWT_SECRET: process.env.JWT_SECRET,
  },
};

export default withNextIntl(nextConfig);
