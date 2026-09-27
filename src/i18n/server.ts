import type { IncomingMessage } from 'node:http'

import { isLocale, type Locale, localeCookie, negotiateLocale } from './locales'
import { loadMessages, type Messages } from './messages'

type LocaleProps = { locale: Locale; messages: Messages }

export async function getLocaleProps(locale: Locale): Promise<LocaleProps> {
  return { locale, messages: await loadMessages(locale) }
}

export function requestLocale(req: IncomingMessage & { cookies?: Partial<Record<string, string>> }): Locale {
  const cookie = req.cookies?.[localeCookie]
  return isLocale(cookie) ? cookie : negotiateLocale(req.headers['accept-language'])
}
