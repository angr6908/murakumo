import type { IconDefinition } from '@fortawesome/free-brands-svg-icons'
import { Link as LinkIcon, LogOut, Mail, Search } from 'lucide-react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
// Type-only import — erased at compile time, so the server-only icon set is not bundled here.
import type { BrandIcons } from '../utils/brandIcons'

import { useI18n } from '../i18n'

import { getPublicRuntimeConfig } from '../utils/publicRuntimeConfig'
import SwitchLang from './SwitchLang'
import Tip from './Tip'

const ClearTokensDialog = dynamic(() => import('./ClearTokensDialog'), { ssr: false })
const SearchModal = dynamic(() => import('./SearchModal'), { ssr: false })

const BrandIcon = ({ icon }: { icon?: IconDefinition }) => {
  if (!icon) return <LinkIcon />
  const [width, height, , , path] = icon.icon
  return (
    <svg className="size-4.5" viewBox={`0 0 ${width} ${height}`} fill="currentColor" aria-hidden="true">
      {(Array.isArray(path) ? path : [path]).map(d => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

const Navbar = ({ brandIcons = {} }: { brandIcons?: BrandIcons }) => {
  const router = useRouter()
  const { t } = useI18n()
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
    toast.success(t('Cleared all tokens'))
    setTimeout(() => {
      router.reload()
    }, 1000)
  }

  return (
    <header className="surface-bar sticky top-0 z-40 w-full">
      {searchMounted && <SearchModal searchOpen={searchOpen} setSearchOpen={setSearchOpen} />}

      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center gap-1 px-3 sm:px-4">
        <Link
          href="/"
          passHref
          className="mr-auto flex min-w-0 items-center gap-2.5 pr-2 transition-opacity duration-(--duration-base) hover:opacity-70"
        >
          <Image className="shrink-0" src={siteConfig.icon} alt="icon" width="24" height="24" priority />
          <span className="truncate font-semibold text-[0.9375rem]">{siteConfig.title}</span>
        </Link>

        <button
          type="button"
          className="btn btn-icon sm:mr-1 sm:w-auto sm:min-w-0 sm:max-w-64 sm:flex-1 sm:justify-start sm:bg-accent sm:px-3 sm:font-normal sm:text-muted-foreground sm:hover:bg-muted"
          aria-label={t('Search')}
          onClick={openSearchBox}
        >
          <Search className="size-4.5 sm:size-4" />
          <span className="hidden truncate sm:inline">{t('Search ...')}</span>
          <span className="ml-auto hidden items-center gap-1 md:flex">
            <kbd className="kbd">{isMac ? '⌘' : 'Ctrl'}</kbd>
            <kbd className="kbd">K</kbd>
          </span>
        </button>

        {siteConfig.links.map((l: { name: string; link: string }) => (
          <Tip key={l.name} label={l.name} side="bottom">
            <a href={l.link} target="_blank" rel="noopener noreferrer" className="btn btn-icon" aria-label={l.name}>
              <BrandIcon icon={brandIcons[l.name.toLowerCase()]} />
            </a>
          </Tip>
        ))}

        {siteConfig.email && (
          <Tip label={t('Email')} side="bottom">
            <a href={siteConfig.email} className="btn btn-icon" aria-label={t('Email')}>
              <Mail />
            </a>
          </Tip>
        )}

        <SwitchLang />

        {tokenPresent && (
          <Tip label={t('Logout')} side="bottom">
            <button
              type="button"
              className="btn btn-icon"
              aria-label={t('Logout')}
              onClick={() => {
                setTokenDialogMounted(true)
                setIsOpen(true)
              }}
            >
              <LogOut />
            </button>
          </Tip>
        )}
      </nav>

      {tokenDialogMounted && (
        <ClearTokensDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onClear={clearTokens}
          protectedRoutes={protectedRoutes}
        />
      )}
    </header>
  )
}

export default Navbar
