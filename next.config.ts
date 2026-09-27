import type { NextConfig } from 'next'

import { acceptLanguageRules, localeCookie, locales } from './src/i18n/locales'

const everyPath = '/:path*'
const localised = (lang: string) => `/l10n/${lang}/:path*`

const nextConfig: NextConfig = {
  // 16.3 generates AGENTS.md/CLAUDE.md on dev by default; opt out.
  agentRules: false,
  // Bundle server dependencies (e.g. @vercel/blob) into the function output.
  // The externalized-module references emitted by default fail to load on
  // Vercel ("Failed to load external module @vercel/blob-...").
  bundlePagesRouterDependencies: true,
  trailingSlash: true,
  transpilePackages: ['react-syntax-highlighter', 'highlight.js', 'lowlight'],
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        {
          source: everyPath,
          has: [{ type: 'cookie', key: localeCookie, value: `(?<lang>${locales.join('|')})` }],
          destination: localised(':lang'),
        },
        ...acceptLanguageRules.map(({ locale, value }) => ({
          source: everyPath,
          has: [{ type: 'header' as const, key: 'accept-language', value }],
          destination: localised(locale),
        })),
        { source: everyPath, destination: localised('en') },
      ],
      fallback: [],
    }
  },
}

export default nextConfig
