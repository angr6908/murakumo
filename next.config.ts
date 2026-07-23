import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Bundle server dependencies (e.g. @vercel/blob) into the function output.
  // The externalized-module references emitted by default fail to load on
  // Vercel ("Failed to load external module @vercel/blob-...").
  bundlePagesRouterDependencies: true,
  trailingSlash: true,
  transpilePackages: ['react-syntax-highlighter', 'highlight.js', 'lowlight'],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
