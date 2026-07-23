import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import * as allBrandIcons from '@fortawesome/free-brands-svg-icons'
import type { PublicSiteLink } from './siteConfig'

/**
 * SERVER ONLY. The namespace import below pulls in every brand icon (~240 KB gzipped), so this
 * module must only ever be reached from `getServerSideProps`, which Next.js strips from client
 * bundles. Client code may import the `BrandIcons` type from here — `import type` is erased.
 */

export type BrandIcons = Record<string, IconDefinition>

const isIconDef = (icon: unknown): icon is IconDefinition =>
  typeof icon === 'object' && icon !== null && 'iconName' in icon && typeof (icon as any).iconName === 'string'

const iconByName: BrandIcons = Object.fromEntries(
  Object.values(allBrandIcons)
    .filter(isIconDef)
    .map(icon => [icon.iconName, icon]),
)

/** Resolve only the icons the configured links actually use, so only those are sent to the client. */
export function resolveBrandIcons(links: PublicSiteLink[]): BrandIcons {
  return Object.fromEntries(
    links.flatMap(({ name }) => {
      const key = name.toLowerCase()
      const icon = iconByName[key]
      return icon ? [[key, icon] as const] : []
    }),
  )
}
