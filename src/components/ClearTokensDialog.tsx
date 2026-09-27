import { Dialog } from '@videojs/react'
import { KeyRound, Trash } from 'lucide-react'

import { useI18n } from '../i18n'
import ModalShell from './ModalShell'

export default function ClearTokensDialog({
  isOpen,
  onClose,
  onClear,
  protectedRoutes,
}: {
  isOpen: boolean
  onClose: () => void
  onClear: () => void
  protectedRoutes: string[]
}) {
  const { t } = useI18n()
  return (
    <ModalShell open={isOpen} onClose={onClose} panelClassName="max-w-sm">
      <div className="dialog-content">
        <Dialog.Title className="dialog-title">{t('Clear all tokens?')}</Dialog.Title>
        <Dialog.Description className="dialog-description">
          {t(
            'These tokens are used to authenticate yourself into password protected folders, clearing them means that you will need to re-enter the passwords again.',
          )}
        </Dialog.Description>
      </div>

      <div className="well scroll-thin max-h-32 overflow-y-auto p-1.5">
        {protectedRoutes.map(route => (
          <div key={route} className="flex items-center gap-2 px-1.5 py-1 font-mono text-muted-foreground text-xs">
            <KeyRound className="size-3.5 shrink-0" />
            <span className="truncate">{route}</span>
          </div>
        ))}
      </div>

      <div className="dialog-actions">
        <Dialog.Close className="btn btn-secondary">{t('Cancel')}</Dialog.Close>
        <button type="button" className="btn btn-danger" onClick={onClear}>
          <Trash className="size-4" />
          <span>{t('Clear all')}</span>
        </button>
      </div>
    </ModalShell>
  )
}
