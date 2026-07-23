import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
// Type-only import — erased at compile time, so the server-only icon set is not bundled here.
import type { BrandIcons } from '../utils/brandIcons'
import { FontAwesomeIcon } from '../utils/fontawesome'

import { getPublicRuntimeConfig } from '../utils/publicRuntimeConfig'

const ClearTokensDialog = dynamic(() => import('./ClearTokensDialog'), { ssr: false })
const SearchModal = dynamic(() => import('./SearchModal'), { ssr: false })

const Navbar = ({ brandIcons = {} }: { brandIcons?: BrandIcons }) => {
  const router = useRouter()
  const [isMac, setIsMac] = useState(false)
  const siteConfig = getPublicRuntimeConfig()
  const protectedRoutes = siteConfig.protectedRoutes

  useEffect(() => {
    setIsMac(window.navigator.userAgent.includes('Mac OS'))
  }, [])

  const [tokenPresent, setTokenPresent] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [tokenDialogMounted, setTokenDialogMounted] = useState(false)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchMounted, setSearchMounted] = useState(false)
  const openSearchBox = useCallback(() => {
    setSearchMounted(true)
    setSearchOpen(true)
  }, [])

  useEffect(() => {
    const handleSearchHotkey = (event: KeyboardEvent) => {
      const modifierPressed = isMac ? event.metaKey : event.ctrlKey
      if (!modifierPressed || event.key.toLowerCase() !== 'k') return

      event.preventDefault()
      openSearchBox()
    }

    window.addEventListener('keydown', handleSearchHotkey)
    return () => window.removeEventListener('keydown', handleSearchHotkey)
  }, [openSearchBox, isMac])

  useEffect(() => {
    setTokenPresent(protectedRoutes.some(r => Object.hasOwn(localStorage, r)))
  }, [protectedRoutes])

  const clearTokens = () => {
    setIsOpen(false)
    protectedRoutes.forEach(r => {
      localStorage.removeItem(r)
    })
    toast.success('Cleared all tokens')
    setTimeout(() => {
      router.reload()
    }, 1000)
  }

  return (
    <div className="sticky top-0 z-[100] border-gray-900/10 border-b bg-white bg-opacity-80 backdrop-blur-md dark:border-gray-500/30 dark:bg-gray-900">
      {searchMounted && <SearchModal searchOpen={searchOpen} setSearchOpen={setSearchOpen} />}

      <div className="mx-auto flex w-full items-center justify-between space-x-4 px-4 py-1">
        <Link href="/" passHref className="flex items-center space-x-2 py-2 hover:opacity-80 md:p-2 dark:text-white">
          <Image src={siteConfig.icon} alt="icon" width="25" height="25" priority />
          <span className="hidden font-bold sm:block">{siteConfig.title}</span>
        </Link>

        <div className="flex flex-1 items-center space-x-4 text-gray-700 md:flex-initial">
          <button
            className="flex flex-1 items-center justify-between rounded-lg bg-gray-100 px-2.5 py-1.5 hover:opacity-80 md:w-48 dark:bg-gray-800 dark:text-white"
            onClick={openSearchBox}
          >
            <div className="flex items-center space-x-2">
              <FontAwesomeIcon className="h-4 w-4" icon="search" />
              <span className="truncate font-medium text-sm">{'Search ...'}</span>
            </div>

            <div className="hidden items-center space-x-1 md:flex">
              <div className="rounded-lg bg-gray-200 px-2 py-1 font-medium text-xs dark:bg-gray-700">
                {isMac ? '⌘' : 'Ctrl'}
              </div>
              <div className="rounded-lg bg-gray-200 px-2 py-1 font-medium text-xs dark:bg-gray-700">K</div>
            </div>
          </button>

          {siteConfig.links.length !== 0 &&
            siteConfig.links.map((l: { name: string; link: string }) => (
              <a
                key={l.name}
                href={l.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 hover:opacity-80 dark:text-white"
              >
                <FontAwesomeIcon icon={(brandIcons[l.name.toLowerCase()] ?? 'link') as IconProp} />
                <span className="hidden font-medium text-sm md:inline-block">{l.name}</span>
              </a>
            ))}

          {siteConfig.email && (
            <a href={siteConfig.email} className="flex items-center space-x-2 hover:opacity-80 dark:text-white">
              <FontAwesomeIcon icon={['far', 'envelope']} />
              <span className="hidden font-medium text-sm md:inline-block">{'Email'}</span>
            </a>
          )}

          {tokenPresent && (
            <button
              className="flex items-center space-x-2 hover:opacity-80 dark:text-white"
              onClick={() => {
                setTokenDialogMounted(true)
                setIsOpen(true)
              }}
            >
              <span className="hidden font-medium text-sm md:inline-block">{'Logout'}</span>
              <FontAwesomeIcon icon="sign-out-alt" />
            </button>
          )}
        </div>
      </div>

      {tokenDialogMounted && (
        <ClearTokensDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onClear={clearTokens}
          protectedRoutes={protectedRoutes}
        />
      )}
    </div>
  )
}

export default Navbar
