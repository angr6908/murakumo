import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  agentRules: false,
  // Bundle server dependencies (e.g. @vercel/blob) into the function output.
  // The externalized-module references emitted by default fail to load on
  // Vercel ("Failed to load external module @vercel/blob-...").
  bundlePagesRouterDependencies: true,
  experimental: {
    // TypeScript 7 ships no JS compiler API; invoke the native tsc CLI instead
    useTypeScriptCli: true,
  },
  trailingSlash: true,
  transpilePackages: ['react-syntax-highlighter', 'highlight.js', 'lowlight'],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
