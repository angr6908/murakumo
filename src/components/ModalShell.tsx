import { Dialog, Transition } from '@headlessui/react'
import { Fragment, type ReactNode, type RefObject } from 'react'

/**
 * The Headless UI dialog scaffolding shared by the app's modals: backdrop, vertical centering,
 * and the enter/leave transitions. Callers supply only the panel body.
 */
export default function ModalShell({
  open,
  onClose,
  initialFocus,
  backdropClassName,
  panelClassName,
  leaveDuration = 'duration-100',
  children,
}: {
  open: boolean
  onClose: () => void
  initialFocus?: RefObject<HTMLElement | null>
  backdropClassName: string
  panelClassName: string
  leaveDuration?: string
  children: ReactNode
}) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-10 overflow-y-auto" onClose={onClose} initialFocus={initialFocus}>
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-100"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave={`ease-in ${leaveDuration}`}
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className={`fixed inset-0 ${backdropClassName}`} />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span className="inline-block h-screen align-middle" aria-hidden="true">
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-100"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave={`ease-in ${leaveDuration}`}
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className={panelClassName}>{children}</div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
