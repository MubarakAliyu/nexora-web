import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. A stray package-lock.json in the
  // user's home directory otherwise makes Next infer the wrong root for file tracing.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
