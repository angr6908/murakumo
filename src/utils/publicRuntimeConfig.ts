import { readSiteConfig, type PublicRuntimeConfig } from './siteConfig'

export type { PublicRuntimeConfig, PublicSiteLink } from './siteConfig'

export function readPublicRuntimeConfig(): PublicRuntimeConfig {
  return readSiteConfig()
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

export function serializePublicRuntimeConfig(): string {
  return JSON.stringify(readPublicRuntimeConfig()).replace(/</g, '\\u003c')
}

export function getServerSidePublicConfigProps() {
  return { props: { publicConfig: readPublicRuntimeConfig() } }
}
