import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @xenova/transformers ships ONNX/WASM that should not be bundled by webpack;
  // mark it external for the server runtime so Node loads it directly.
  serverExternalPackages: ["@xenova/transformers"],
};

export default nextConfig;
