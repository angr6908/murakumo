import { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '../utils/fontawesome'
import { useEffect, useRef, useState } from 'react'

import useLocalStorage from '../utils/useLocalStorage'

export const layouts: Array<{ id: number; name: 'Grid' | 'List'; icon: IconProp }> = [
  { id: 1, name: 'List', icon: 'th-list' },
  { id: 2, name: 'Grid', icon: 'th' },
]

const SwitchLayout = () => {
  const [preferredLayout, setPreferredLayout] = useLocalStorage('preferredLayout', layouts[0])
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const selectLayout = (layout: (typeof layouts)[number]) => {
    setPreferredLayout(layout)
    setOpen(false)
  }

  return (
    <div ref={container} className="relative w-24 flex-shrink-0 text-sm text-gray-600 md:w-28 dark:text-gray-300">
      <button
        type="button"
        className="relative w-full cursor-pointer rounded pl-4"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(open => !open)}
      >
        <span className="pointer-events-none flex items-center">
          <FontAwesomeIcon className="mr-2 h-3 w-3" icon={preferredLayout.icon} />
          <span>{preferredLayout.name}</span>
        </span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <FontAwesomeIcon className="h-3 w-3" icon="chevron-down" />
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 z-20 mt-1 w-32 overflow-auto rounded border border-gray-900/10 bg-white py-1 shadow-lg dark:border-gray-500/30 dark:bg-gray-800"
          role="listbox"
        >
          {layouts.map(layout => {
            const selected = layout.name === preferredLayout.name

            return (
              <button
                key={layout.id}
                type="button"
                role="option"
                aria-selected={selected}
                className={`${
                  selected ? 'bg-blue-50 text-blue-700 dark:bg-blue-600/10 dark:text-blue-400' : ''
                } relative flex w-full cursor-pointer items-center py-1.5 pl-3 text-left text-gray-600 select-none hover:opacity-80 dark:text-gray-300`}
                onClick={() => selectLayout(layout)}
              >
                <FontAwesomeIcon className="mr-2 h-3 w-3" icon={layout.icon} />
                <span className={selected ? 'font-medium' : 'font-normal'}>{layout.name}</span>
                {selected && (
                  <span className="absolute inset-y-0 right-3 flex items-center">
                    <FontAwesomeIcon className="h-3 w-3" icon="check" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SwitchLayout
