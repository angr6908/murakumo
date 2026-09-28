import type { Locale } from '../i18n/locales'
import { getLocaleProps } from '../i18n/server'
import { type BrandIcons, resolveBrandIcons } from './brandIcons'
import siteConfig from './siteConfig'

export type PageProps = { brandIcons: BrandIcons }

/**
 * SERVER ONLY — call from `getServerSideProps`. Resolving the brand icons here keeps the icon
 * set out of the client bundle while still rendering them in the server markup, so they do not
 * pop in after hydration.
 */
export async function getPageProps(locale: Locale) {
  return { brandIcons: resolveBrandIcons(siteConfig.links), ...(await getLocaleProps(locale)) }
}
