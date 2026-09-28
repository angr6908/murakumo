import { Menu } from '@videojs/react'
import { CheckIcon, ChevronIcon } from '@videojs/react/icons'
import { LayoutGrid, LayoutList, type LucideIcon } from 'lucide-react'

import { useI18n } from '../i18n'
import useLocalStorage from '../utils/useLocalStorage'

const layouts: Array<{ name: 'Grid' | 'List'; icon: LucideIcon }> = [
  { name: 'List', icon: LayoutList },
  { name: 'Grid', icon: LayoutGrid },
]

export const useLayout = () => {
  const [stored, setStored] = useLocalStorage<{ name: string }>('preferredLayout', { name: layouts[0].name })
  const layout = layouts.find(l => l.name === stored?.name) ?? layouts[0]
  const setLayout = (name: string) => {
    if (layouts.some(l => l.name === name)) setStored({ name })
  }
  return [layout, setLayout] as const
}

const SwitchLayout = () => {
  const [layout, setLayout] = useLayout()
  const { t } = useI18n()
  const Icon = layout.icon

  return (
    <Menu.Root side="bottom" align="end">
      <Menu.Trigger className="btn btn-sm gap-1.5 text-muted-foreground">
        <Icon className="size-4" />
        <span>{t(layout.name)}</span>
        <ChevronIcon className="size-3.5 rotate-90" />
      </Menu.Trigger>
      <Menu.Popup className="popup surface-popover menu-popup">
        <Menu.Content className="menu-content">
          <Menu.RadioGroup
            value={layout.name}
            onValueChange={setLayout}
            aria-label={t('Layout')}
            className="flex flex-col gap-0.5"
          >
            {layouts.map(option => (
              <Menu.RadioItem key={option.name} value={option.name} className="menu-item">
                <option.icon className="size-4" />
                <span>{t(option.name)}</span>
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
