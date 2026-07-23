import siteConfig, { type PublicRuntimeConfig } from './siteConfig'

export type { PublicRuntimeConfig, PublicSiteLink } from './siteConfig'

// Site config is derived from env vars, which are fixed for the process lifetime.
export function readPublicRuntimeConfig(): PublicRuntimeConfig {
  return siteConfig
}

declare global {
  interface Window {
    __ONEDRIVE_INDEX_PUBLIC_CONFIG__?: PublicRuntimeConfig
  }
}

export function getPublicRuntimeConfig(): PublicRuntimeConfig {
  return typeof window !== 'undefined' && window.__ONEDRIVE_INDEX_PUBLIC_CONFIG__
    ? window.__ONEDRIVE_INDEX_PUBLIC_CONFIG__
    : readPublicRuntimeConfig()
}

const serializedPublicRuntimeConfig = JSON.stringify(siteConfig).replace(/</g, '\\u003c')

export function serializePublicRuntimeConfig(): string {
  return serializedPublicRuntimeConfig
}
