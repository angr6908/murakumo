import en from './messages/en.json'
import type { Locale } from './locales'

export type Messages = Record<string, string>

const loaders: Record<Exclude<Locale, 'en'>, () => Promise<{ default: Messages }>> = {
  'de-DE': () => import('./messages/de-DE.json'),
  es: () => import('./messages/es.json'),
  hi: () => import('./messages/hi.json'),
  id: () => import('./messages/id.json'),
  ja: () => import('./messages/ja.json'),
  ko: () => import('./messages/ko.json'),
  'tr-TR': () => import('./messages/tr-TR.json'),
  'zh-CN': () => import('./messages/zh-CN.json'),
  'zh-TW': () => import('./messages/zh-TW.json'),
}

export async function loadMessages(locale: Locale): Promise<Messages> {
  return locale === 'en' ? en : (await loaders[locale]()).default
}
