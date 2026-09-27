import { createContext, Fragment, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { defaultLocale, isLocale, type Locale, localeCookie } from './locales'
import { loadMessages, type Messages } from './messages'
import en from './messages/en.json'

type Vars = Record<string, string | number>
type RichTags = Record<string, (chunk: string) => ReactNode>

type I18nValue = {
  locale: Locale
  messages: Messages
  setLocale: (locale: Locale) => Promise<void>
}

const I18nContext = createContext<I18nValue>({
  locale: defaultLocale,
  messages: en,
  setLocale: async () => {},
})

const pluralRules = new Map<Locale, Intl.PluralRules>()

const pluralCategory = (locale: Locale, count: number) => {
  let rules = pluralRules.get(locale)
  if (!rules) {
    rules = new Intl.PluralRules(locale)
    pluralRules.set(locale, rules)
  }
  return rules.select(count)
}

function translate(locale: Locale, messages: Messages, key: string, vars?: Vars): string {
  const count = vars?.count
  const text =
    (typeof count === 'number'
      ? (messages[`${key}|${pluralCategory(locale, count)}`] ?? messages[`${key}|other`])
      : undefined) ??
    messages[key] ??
    key
  if (!vars) return text
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
}

function richText(text: string, tags: RichTags): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(/<(\w+)>(.*?)<\/\1>/g)) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const render = tags[match[1]]
    nodes.push(<Fragment key={match.index}>{render ? render(match[2]) : match[2]}</Fragment>)
    last = match.index + match[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

const readLocaleCookie = () =>
  document.cookie
    .split('; ')
    .find(entry => entry.startsWith(`${localeCookie}=`))
    ?.slice(localeCookie.length + 1)

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale?: string
  messages?: Messages
  children: ReactNode
}) {
  const [state, setState] = useState(() => ({
    locale: isLocale(locale) ? locale : defaultLocale,
    messages: { ...en, ...messages },
  }))

  useEffect(() => {
    if (!readLocaleCookie()) document.cookie = `${localeCookie}=${state.locale}; path=/; SameSite=Lax`
  }, [state.locale])

  const setLocale = useCallback(async (next: Locale) => {
    const nextMessages = await loadMessages(next)
    document.cookie = `${localeCookie}=${next}; path=/; max-age=31536000; SameSite=Lax`
    document.documentElement.lang = next
    setState({ locale: next, messages: { ...en, ...nextMessages } })
  }, [])

  const value = useMemo(() => ({ ...state, setLocale }), [state, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const { locale, messages, setLocale } = useContext(I18nContext)
  return useMemo(() => {
    const t = (key: string, vars?: Vars) => translate(locale, messages, key, vars)
    const rich = (key: string, tags: RichTags, vars?: Vars) => richText(t(key, vars), tags)
    return { locale, setLocale, t, rich }
  }, [locale, messages, setLocale])
}
