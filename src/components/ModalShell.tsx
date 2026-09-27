import { Dialog } from '@videojs/react'
import { type ReactNode, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function ModalShell({
  open,
  onClose,
  panelClassName = '',
  layerClassName = '',
  children,
}: {
  open: boolean
  onClose: () => void
  panelClassName?: string
  layerClassName?: string
  children: ReactNode
}) {
  const pressedOutside = useRef(false)

  return (
    <Dialog.Root open={open} onOpenChange={next => !next && onClose()}>
      {createPortal(
        <>
          <Dialog.Backdrop className="dialog-backdrop" />
          <Dialog.Popup
            className={`dialog-layer ${layerClassName}`}
            onPointerDown={event => {
              pressedOutside.current = event.target === event.currentTarget
            }}
            onClick={event => {
              if (pressedOutside.current && event.target === event.currentTarget) onClose()
              pressedOutside.current = false
            }}
          >
            <div className={`dialog-panel surface-popover ${panelClassName}`}>{children}</div>
          </Dialog.Popup>
        </>,
        document.body,
      )}
    </Dialog.Root>
  )
}
