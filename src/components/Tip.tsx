import { Tooltip } from '@videojs/react'
import { cloneElement, type FocusEvent, type PointerEvent, type ReactElement, useRef } from 'react'

type Handler<E> = ((event: E) => void) | undefined

const chain =
  <E,>(first: Handler<E>, second: Handler<E>) =>
  (event: E) => {
    first?.(event)
    second?.(event)
  }

export default function Tip({
  label,
  side = 'top',
  children,
}: {
  label: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  children: ReactElement<Record<string, any>>
}) {
  const pressed = useRef(false)

  return (
    <Tooltip.Root side={side}>
      <Tooltip.Trigger
        render={({ onFocus, onPointerDown, onPointerEnter, ...props }) =>
          cloneElement(children, {
            ...props,
            onPointerDown: chain(children.props.onPointerDown, (event: PointerEvent<HTMLElement>) => {
              pressed.current = true
              onPointerDown?.(event)
            }),
            onPointerEnter: chain(children.props.onPointerEnter, (event: PointerEvent<HTMLElement>) => {
              if (event.currentTarget.getAttribute('aria-expanded') !== 'true') onPointerEnter?.(event)
            }),
            onFocus: chain(children.props.onFocus, (event: FocusEvent<HTMLElement>) => {
              if (pressed.current || (event.target instanceof Element && event.target.matches(':focus-visible'))) {
                pressed.current = false
                onFocus?.(event)
              }
            }),
          })
        }
      />
      <Tooltip.Popup className="popup surface-popover tooltip">{label}</Tooltip.Popup>
    </Tooltip.Root>
  )
}
