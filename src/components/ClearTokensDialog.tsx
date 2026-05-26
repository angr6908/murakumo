import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'

import { FontAwesomeIcon } from '../utils/fontawesome'

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
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-10 overflow-y-auto" open={isOpen} onClose={onClose}>
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-100"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-50"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-50 dark:bg-gray-800" />
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
            leave="ease-in duration-50"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="my-8 inline-block w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle transition-all dark:bg-gray-900">
              <Dialog.Title className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {'Clear all tokens?'}
              </Dialog.Title>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {'These tokens are used to authenticate yourself into password protected folders, ' +
                    'clearing them means that you will need to re-enter the passwords again.'}
                </p>
              </div>

              <div className="mt-4 max-h-32 overflow-y-scroll font-mono text-sm dark:text-gray-100">
                {protectedRoutes.map((route, index) => (
                  <div key={index} className="flex items-center space-x-1">
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
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
