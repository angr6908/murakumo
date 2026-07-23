import { type BrandIcons, resolveBrandIcons } from './brandIcons'
import { type PublicRuntimeConfig, readPublicRuntimeConfig } from './publicRuntimeConfig'

export type PublicConfigProps = { publicConfig: PublicRuntimeConfig; brandIcons: BrandIcons }

/**
 * SERVER ONLY — call from `getServerSideProps`. Resolving the brand icons here keeps the icon
 * set out of the client bundle while still rendering them in the server markup, so they do not
 * pop in after hydration.
 */
export function getServerSidePublicConfigProps(): { props: PublicConfigProps } {
  const publicConfig = readPublicRuntimeConfig()
  return { props: { publicConfig, brandIcons: resolveBrandIcons(publicConfig.links) } }
}
