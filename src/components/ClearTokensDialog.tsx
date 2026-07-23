import { Dialog } from '@headlessui/react'

import { FontAwesomeIcon } from '../utils/fontawesome'
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
  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      backdropClassName="bg-gray-50 dark:bg-gray-800"
      panelClassName="my-8 inline-block w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle transition-all dark:bg-gray-900"
      leaveDuration="duration-50"
    >
      <Dialog.Title className="font-bold text-gray-900 text-lg dark:text-gray-100">{'Clear all tokens?'}</Dialog.Title>
      <div className="mt-2">
        <p className="text-gray-500 text-sm">
          {'These tokens are used to authenticate yourself into password protected folders, ' +
            'clearing them means that you will need to re-enter the passwords again.'}
        </p>
      </div>

      <div className="mt-4 max-h-32 overflow-y-scroll font-mono text-sm dark:text-gray-100">
        {protectedRoutes.map(route => (
          <div key={route} className="flex items-center space-x-1">
            <FontAwesomeIcon icon="key" />
            <span className="truncate">{route}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-end">
        <button
          className="mr-3 inline-flex items-center justify-center space-x-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-400"
          onClick={onClose}
        >
          {'Cancel'}
        </button>
        <button
          className="inline-flex items-center justify-center space-x-2 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-400"
          onClick={onClear}
        >
          <FontAwesomeIcon icon={['far', 'trash-alt']} />
          <span>{'Clear all'}</span>
        </button>
      </div>
    </ModalShell>
  )
}
