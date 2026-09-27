import { Menu } from '@videojs/react'
import { CheckIcon, ChevronIcon } from '@videojs/react/icons'
import { LayoutGrid, LayoutList, type LucideIcon } from 'lucide-react'

import useLocalStorage from '../utils/useLocalStorage'

const layouts: Array<{ id: number; name: 'Grid' | 'List'; icon: LucideIcon }> = [
  { id: 1, name: 'List', icon: LayoutList },
  { id: 2, name: 'Grid', icon: LayoutGrid },
]

export const useLayout = () => {
  const [stored, setStored] = useLocalStorage<{ id: number; name: string }>('preferredLayout', {
    id: layouts[0].id,
    name: layouts[0].name,
  })
  const layout = layouts.find(l => l.name === stored?.name) ?? layouts[0]
  const setLayout = (name: string) => {
    const next = layouts.find(l => l.name === name)
    if (next) setStored({ id: next.id, name: next.name })
  }
  return [layout, setLayout] as const
}

const SwitchLayout = () => {
  const [layout, setLayout] = useLayout()
  const Icon = layout.icon

  return (
    <Menu.Root side="bottom" align="end">
      <Menu.Trigger className="btn btn-sm gap-1.5 text-muted-foreground">
        <Icon className="size-4" />
        <span>{layout.name}</span>
        <ChevronIcon className="size-3.5 rotate-90" />
      </Menu.Trigger>
      <Menu.Popup className="popup surface-popover menu-popup">
        <Menu.Content className="menu-content">
          <Menu.RadioGroup
            value={layout.name}
            onValueChange={setLayout}
            aria-label="Layout"
            className="flex flex-col gap-0.5"
          >
            {layouts.map(option => (
              <Menu.RadioItem key={option.id} value={option.name} className="menu-item">
                <option.icon className="size-4" />
                <span>{option.name}</span>
                <Menu.ItemIndicator checked={option.name === layout.name} className="menu-item-indicator">
                  <CheckIcon className="size-4.5" />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  )
}

export default SwitchLayout
