import type { IconDefinition, IconProp } from '@fortawesome/fontawesome-svg-core'

import * as BrandIcons from '@fortawesome/free-brands-svg-icons'

import { FontAwesomeIcon } from '../utils/fontawesome'

const isIconDef = (icon: unknown): icon is IconDefinition =>
  typeof icon === 'object' && icon !== null && 'iconName' in icon && typeof (icon as any).iconName === 'string'

const brandIconByName: Record<string, IconDefinition> = Object.fromEntries(
  Object.values(BrandIcons)
    .filter(isIconDef)
    .map(icon => [icon.iconName, icon]),
)

export default function BrandIcon({ name }: { name: string }) {
  const icon: IconProp = brandIconByName[name.toLowerCase()] ?? 'link'
  return <FontAwesomeIcon icon={icon} />
}
