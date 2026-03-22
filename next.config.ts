import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["aws-iot-device-sdk", "ws"],
  experimental: {
    webpackBuildWorker: false,
  },
};

export default nextConfig;
