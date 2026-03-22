import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["aws-iot-device-sdk", "ws"],
  experimental: {
    webpackBuildWorker: false,
  },
  // allowedDevOrigins: ["192.168.10.45"],
};

export default nextConfig;
