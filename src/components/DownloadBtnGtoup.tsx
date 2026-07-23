import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { type MouseEventHandler, type ReactNode, useState } from 'react'
import { FontAwesomeIcon } from '../utils/fontawesome'

import { getBaseUrl } from '../utils/getBaseUrl'
import { rawFileUrl } from '../utils/odUrls'
import { useCopyLink } from '../utils/useCopyLink'
import { useCurrentPathToken } from '../utils/useCurrentPathToken'

const CustomEmbedLinkMenu = dynamic(() => import('./CustomEmbedLinkMenu'), { ssr: false })

const colorMap = {
  gray: 'hover:text-gray-600 dark:hover:text-white border-gray-300 dark:border-gray-500',
  blue: 'hover:text-blue-600 border-blue-300 dark:border-blue-700',
  teal: 'hover:text-teal-600 border-teal-300 dark:border-teal-700',
  red: 'hover:text-red-600 border-red-300 dark:border-red-700',
  green: 'hover:text-green-600 border-green-300 dark:border-green-700',
  pink: 'hover:text-pink-600 border-pink-300 dark:border-pink-700',
  yellow: 'hover:text-yellow-400 border-yellow-300 dark:border-yellow-400',
}

type ButtonColor = keyof typeof colorMap

const btnStyleMap = (btnColor?: ButtonColor) => colorMap[btnColor ?? 'gray']

export const DownloadButton = ({
  onClickCallback,
  btnColor,
  btnText,
  btnIcon,
  btnImage,
  btnTitle,
}: {
  onClickCallback: MouseEventHandler<HTMLButtonElement>
  btnColor?: ButtonColor
  btnText: string
  btnIcon?: IconProp
  btnImage?: string
  btnTitle?: string
}) => {
  return (
    <button
      className={`flex items-center space-x-2 rounded-lg border bg-white px-4 py-2 font-medium text-gray-900 text-sm hover:bg-gray-100/10 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-900 ${btnStyleMap(
        btnColor,
      )}`}
      title={btnTitle}
      onClick={onClickCallback}
    >
      {btnIcon && <FontAwesomeIcon icon={btnIcon} />}
      {btnImage && <Image src={btnImage} alt={btnImage} width={20} height={20} />}
      <span>{btnText}</span>
    </button>
  )
}

/** Download / copy link / customise link, plus any preview specific buttons passed as children. */
const DownloadButtonGroup = ({ children }: { children?: ReactNode }) => {
  const { asPath, hashedToken } = useCurrentPathToken()

  const copyLink = useCopyLink()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuMounted, setMenuMounted] = useState(false)
  const directUrl = rawFileUrl(asPath, hashedToken)

  const openMenu = () => {
    setMenuMounted(true)
    setMenuOpen(true)
  }

  return (
    <>
      {menuMounted && <CustomEmbedLinkMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} path={asPath} />}
      <div className="flex flex-wrap justify-center gap-2">
        <DownloadButton
          onClickCallback={() => window.open(directUrl)}
          btnColor="blue"
          btnText={'Download'}
          btnIcon="file-download"
          btnTitle={'Download the file directly through OneDrive'}
        />
        <DownloadButton
          onClickCallback={() =>
            copyLink(rawFileUrl(asPath, hashedToken, getBaseUrl()), 'Copied direct link to clipboard.')
          }
          btnColor="pink"
          btnText={'Copy direct link'}
          btnIcon="copy"
          btnTitle={'Copy the permalink to the file to the clipboard'}
        />
        <DownloadButton onClickCallback={openMenu} btnColor="teal" btnText={'Customise link'} btnIcon="pen" />
        {children}
      </div>
    </>
  )
}

export default DownloadButtonGroup
