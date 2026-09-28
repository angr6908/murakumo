import siteConfig, { type PublicRuntimeConfig } from './siteConfig'

declare global {
  interface Window {
    __ONEDRIVE_INDEX_PUBLIC_CONFIG__?: PublicRuntimeConfig
  }
}

export const getPublicRuntimeConfig = (): PublicRuntimeConfig =>
  (typeof window !== 'undefined' && window.__ONEDRIVE_INDEX_PUBLIC_CONFIG__) || siteConfig

export const serializedPublicRuntimeConfig = JSON.stringify(siteConfig).replace(/</g, '\\u003c')
