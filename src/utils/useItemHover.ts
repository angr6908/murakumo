import { useEffect, useRef } from 'react'

export function useItemHover<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    let x = 0
    let y = 0
    let tracking = false
    let settle = 0
    let hovered: Element | null = null

    const hover = (target: EventTarget | null) => {
      if (target === root) return
      const item = target instanceof Element ? target.closest('[data-item]') : null
      const next = item && root.contains(item) ? item : null
      if (next === hovered) return
      hovered?.removeAttribute('data-hover')
      next?.setAttribute('data-hover', '')
      hovered = next
    }

    const track = (event: PointerEvent) => {
      tracking = event.pointerType !== 'touch'
      x = event.clientX
      y = event.clientY
    }

    const onPointerOver = (event: PointerEvent) => {
      track(event)
      hover(tracking ? event.target : null)
    }

    const onPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget) return
      tracking = false
      hover(null)
    }

    const settled = () => {
      settle = 0
      root.removeAttribute('data-scrolling')
    }

    const onScroll = () => {
      if (!tracking) return hover(null)
      if (settle) clearTimeout(settle)
      else root.setAttribute('data-scrolling', '')
      settle = window.setTimeout(settled, 150)
      hover(document.elementFromPoint(x, y))
    }

    const onClick = (event: MouseEvent) => {
      if (!hovered || (event.target !== root && event.target !== hovered)) return
      hovered.querySelector(':scope > a[href]')?.dispatchEvent(new MouseEvent('click', event))
    }

    const controller = new AbortController()
    const { signal } = controller
    document.addEventListener('pointermove', track, { signal })
    document.addEventListener('pointerover', onPointerOver, { signal })
    document.addEventListener('pointerout', onPointerOut, { signal })
    window.addEventListener('scroll', onScroll, { signal })
    root.addEventListener('click', onClick, { signal })
    return () => {
      controller.abort()
      clearTimeout(settle)
      settled()
      hover(null)
    }
  }, [])

  return ref
}
