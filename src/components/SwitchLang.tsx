import { Menu } from '@videojs/react'
import { CheckIcon } from '@videojs/react/icons'
import { Languages } from 'lucide-react'

import { useI18n } from '../i18n'
import { isLocale, localeNames, locales } from '../i18n/locales'
import Tip from './Tip'

const SwitchLang = () => {
  const { locale, setLocale, t } = useI18n()

  return (
    <Menu.Root side="bottom" align="end">
      <Tip label={t('Language')} side="bottom">
        <Menu.Trigger className="btn btn-icon" aria-label={t('Language')}>
          <Languages />
        </Menu.Trigger>
      </Tip>
      <Menu.Popup className="popup surface-popover menu-popup">
        <Menu.Content className="menu-content">
          <Menu.RadioGroup
            value={locale}
            onValueChange={value => isLocale(value) && setLocale(value)}
            aria-label={t('Language')}
            className="flex flex-col gap-0.5"
          >
            {locales.map(code => (
              <Menu.RadioItem key={code} value={code} lang={code} className="menu-item">
                <span>{localeNames[code]}</span>
                <Menu.ItemIndicator checked={code === locale} className="menu-item-indicator">
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

export default SwitchLang
