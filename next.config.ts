import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* other config options here */
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname), // <-- explicitly set project root
};

export default nextConfig;
