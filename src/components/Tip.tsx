import { Tooltip } from '@videojs/react'
import type { ReactElement } from 'react'

export default function Tip({
  label,
  side = 'top',
  children,
}: {
  label: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  children: ReactElement
}) {
  return (
    <Tooltip.Root side={side}>
      <Tooltip.Trigger render={children} />
      <Tooltip.Popup className="popup surface-popover tooltip">{label}</Tooltip.Popup>
    </Tooltip.Root>
  )
}
