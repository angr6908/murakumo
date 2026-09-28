import { getEnv, parseJsonEnv, parseNumberEnv } from './env'

export type PublicSiteLink = { name: string; link: string }

export type PublicRuntimeConfig = {
  icon: string
  title: string
  baseDirectory: string
  maxItems: number
  googleFontLinks: string[]
  footer: string
  protectedRoutes: string[]
  email: string
  links: PublicSiteLink[]
  datetimeFormat: string
}

const siteConfig: PublicRuntimeConfig = {
  icon: getEnv('SITE_ICON', '/icons/128.png'),
  title: getEnv('SITE_TITLE', 'OneDrive'),
  baseDirectory: getEnv('BASE_DIRECTORY', '/'),
  maxItems: parseNumberEnv('MAX_ITEMS', 100),
  googleFontLinks: parseJsonEnv('GOOGLE_FONT_LINKS', [
    'https://fonts.googleapis.com/css2?family=Fira+Mono&family=Inter:wght@400..700&display=swap',
  ]),
  footer: getEnv(
    'SITE_FOOTER',
    'Powered by <a href="https://github.com/angr6908/murakumo" target="_blank" rel="noopener noreferrer">Murakumo</a>.',
  ),
  protectedRoutes: parseJsonEnv('PROTECTED_ROUTES', []),
  email: getEnv('SITE_EMAIL'),
  links: parseJsonEnv('SITE_LINKS', []),
  datetimeFormat: getEnv('DATETIME_FORMAT', 'YYYY-MM-DD HH:mm:ss'),
}

export default siteConfig
