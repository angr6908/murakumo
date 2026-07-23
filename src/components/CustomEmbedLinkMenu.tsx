import { Dialog } from '@headlessui/react'
import { type Dispatch, type SetStateAction, useRef, useState } from 'react'
import { useClipboard } from 'use-clipboard-copy'
import { basename } from '../utils/drivePath'
import { FontAwesomeIcon } from '../utils/fontawesome'
import { getBaseUrl } from '../utils/getBaseUrl'
import { getReadablePath } from '../utils/getReadablePath'
import { namedRawFileUrl, rawFileUrl } from '../utils/odUrls'
import { getStoredToken } from '../utils/protectedRouteHandler'
import HiddenFocusGuard from './HiddenFocusGuard'
import ModalShell from './ModalShell'

function LinkContainer({ title, value }: { title: string; value: string }) {
  const clipboard = useClipboard({ copiedTimeout: 1000 })
  return (
    <>
      <h4 className="py-2 font-medium text-xs uppercase tracking-wider">{title}</h4>
      <div className="group relative mb-2 max-h-24 overflow-y-scroll break-all rounded border border-gray-400/20 bg-gray-50 p-2.5 font-mono dark:bg-gray-800">
        <div className="opacity-80">{value}</div>
        <button
          onClick={() => clipboard.copy(value)}
          className="absolute top-[0.2rem] right-[0.2rem] w-8 rounded border border-gray-400/40 bg-gray-100 py-1.5 opacity-0 transition-all duration-100 hover:bg-gray-200 group-hover:opacity-100 dark:bg-gray-850 dark:hover:bg-gray-700"
        >
          {clipboard.copied ? <FontAwesomeIcon icon="check" /> : <FontAwesomeIcon icon="copy" />}
        </button>
      </div>
    </>
  )
}

export default function CustomEmbedLinkMenu({
  path,
  menuOpen,
  setMenuOpen,
}: {
  path: string
  menuOpen: boolean
  setMenuOpen: Dispatch<SetStateAction<boolean>>
}) {
  const hashedToken = getStoredToken(path)

  const menuFocusGuardRef = useRef<HTMLButtonElement>(null)
  const closeMenu = () => setMenuOpen(false)

  const readablePath = getReadablePath(path)
  const [name, setName] = useState(() => basename(readablePath))

  return (
    <ModalShell
      open={menuOpen}
      onClose={closeMenu}
      initialFocus={menuFocusGuardRef}
      backdropClassName="bg-white/60 dark:bg-gray-800/60"
      panelClassName="inline-block max-h-[80vh] w-full max-w-3xl transform overflow-hidden overflow-y-scroll rounded border border-gray-400/30 bg-white p-4 text-left align-middle text-sm shadow-xl transition-all dark:bg-gray-900 dark:text-white"
    >
      <HiddenFocusGuard ref={menuFocusGuardRef} />
      <Dialog.Title as="h3" className="py-2 font-bold text-xl">
        {'Customise direct link'}
      </Dialog.Title>
      <Dialog.Description as="p" className="py-2 opacity-80">
        {'Change the raw file direct link to a URL ending with the extension of the file.'}{' '}
        <a
          href="https://ovi.swo.moe/docs/features/customise-direct-link"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline"
        >
          {'What is this?'}
        </a>
      </Dialog.Description>

      <div className="mt-4">
        <h4 className="py-2 font-medium text-xs uppercase tracking-wider">{'Filename'}</h4>
        <input
          className="mb-2 w-full rounded border border-gray-600/10 p-2.5 font-mono dark:bg-gray-600 dark:text-white"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <LinkContainer title={'Default'} value={rawFileUrl(readablePath, hashedToken, getBaseUrl())} />
        <LinkContainer title={'URL encoded'} value={rawFileUrl(path, hashedToken, getBaseUrl())} />
        <LinkContainer title={'Customised'} value={namedRawFileUrl(name, readablePath, hashedToken, getBaseUrl())} />
        <LinkContainer
          title={'Customised and encoded'}
          value={namedRawFileUrl(name, path, hashedToken, getBaseUrl())}
        />
      </div>
    </ModalShell>
  )
}
