import { getEnv, parseJsonEnv, parseNumberEnv } from './env'

export type PublicSiteLink = { name: string; link: string }

export type PublicRuntimeConfig = {
  icon: string
  title: string
  baseDirectory: string
  maxItems: number
  googleFontSans: string
  googleFontMono: string
  googleFontLinks: string[]
  footer: string
  protectedRoutes: string[]
  email: string
  links: PublicSiteLink[]
  datetimeFormat: string
}

export const defaultSiteConfig: PublicRuntimeConfig = {
  icon: '/icons/128.png',
  title: 'OneDrive',
  baseDirectory: '/',
  maxItems: 100,
  googleFontSans: 'Inter',
  googleFontMono: 'Fira Mono',
  googleFontLinks: ['https://fonts.googleapis.com/css2?family=Fira+Mono&family=Inter:wght@400;500;700&display=swap'],
  footer:
    'Powered by <a href="https://github.com/angr6908/murakumo" target="_blank" rel="noopener noreferrer">Murakumo</a>.',
  protectedRoutes: [],
  email: '',
  links: [],
  datetimeFormat: 'YYYY-MM-DD HH:mm:ss',
}

export function readSiteConfig(): PublicRuntimeConfig {
  return {
    icon: getEnv('SITE_ICON', defaultSiteConfig.icon),
    title: getEnv('SITE_TITLE', defaultSiteConfig.title),
    baseDirectory: getEnv('BASE_DIRECTORY', defaultSiteConfig.baseDirectory),
    maxItems: parseNumberEnv('MAX_ITEMS', defaultSiteConfig.maxItems),
    googleFontSans: getEnv('GOOGLE_FONT_SANS', defaultSiteConfig.googleFontSans),
    googleFontMono: getEnv('GOOGLE_FONT_MONO', defaultSiteConfig.googleFontMono),
    googleFontLinks: parseJsonEnv('GOOGLE_FONT_LINKS', defaultSiteConfig.googleFontLinks),
    footer: getEnv('SITE_FOOTER', defaultSiteConfig.footer),
    protectedRoutes: parseJsonEnv('PROTECTED_ROUTES', defaultSiteConfig.protectedRoutes),
    email: getEnv('SITE_EMAIL', defaultSiteConfig.email),
    links: parseJsonEnv('SITE_LINKS', defaultSiteConfig.links),
    datetimeFormat: getEnv('DATETIME_FORMAT', defaultSiteConfig.datetimeFormat),
  }
}

const siteConfig = readSiteConfig()

export default siteConfig
