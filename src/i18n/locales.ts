export const locales = ['en', 'de-DE', 'es', 'hi', 'id', 'ja', 'ko', 'tr-TR', 'zh-CN', 'zh-TW'] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeCookie = 'lang'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  'de-DE': 'Deutsch',
  es: 'Español',
  hi: 'हिन्दी',
  id: 'Bahasa Indonesia',
  ja: '日本語',
  ko: '한국어',
  'tr-TR': 'Türkçe',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
}

export const isLocale = (value: unknown): value is Locale => locales.includes(value as Locale)

const tag = (pattern: string) => `\\s*(?:${pattern})(?:[-_,;\\s].*)?`

export const acceptLanguageRules: Array<{ locale: Exclude<Locale, 'en'>; value: string }> = [
  { locale: 'zh-TW', value: tag('[zZ][hH][-_](?:[tT][wW]|[hH][kK]|[mM][oO]|[hH]ant|HANT)') },
  { locale: 'zh-CN', value: tag('[zZ][hH]') },
  { locale: 'de-DE', value: tag('[dD][eE]') },
  { locale: 'es', value: tag('[eE][sS]') },
  { locale: 'hi', value: tag('[hH][iI]') },
  { locale: 'id', value: tag('[iI][dD]|[iI][nN]') },
  { locale: 'ja', value: tag('[jJ][aA]') },
  { locale: 'ko', value: tag('[kK][oO]') },
  { locale: 'tr-TR', value: tag('[tT][rR]') },
]

const acceptLanguagePatterns = acceptLanguageRules.map(({ locale, value }) => ({ locale, pattern: new RegExp(`^${value}$`) }))

export function negotiateLocale(acceptLanguage?: string | string[]): Locale {
  const header = Array.isArray(acceptLanguage) ? acceptLanguage.at(-1) : acceptLanguage
  if (!header) return defaultLocale
  return acceptLanguagePatterns.find(({ pattern }) => pattern.test(header))?.locale ?? defaultLocale
}
