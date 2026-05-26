import { MouseEventHandler, useState } from 'react'
import { FontAwesomeIcon } from '../utils/fontawesome'
import { IconProp } from '@fortawesome/fontawesome-svg-core'
import toast from 'react-hot-toast'
import { useClipboard } from 'use-clipboard-copy'

import Image from 'next/image'
import { useRouter } from 'next/router'

import { getBaseUrl } from '../utils/getBaseUrl'
import { rawFileUrl } from '../utils/odUrls'
import { getStoredToken } from '../utils/protectedRouteHandler'
import CustomEmbedLinkMenu from './CustomEmbedLinkMenu'

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
      className={`flex items-center space-x-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100/10 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-900 ${btnStyleMap(
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

const DownloadButtonGroup = () => {
  const { asPath } = useRouter()
  const hashedToken = getStoredToken(asPath)

  const clipboard = useClipboard()
  const [menuOpen, setMenuOpen] = useState(false)
  const directUrl = rawFileUrl(asPath, hashedToken)

  return (
    <>
      <CustomEmbedLinkMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} path={asPath} />
      <div className="flex flex-wrap justify-center gap-2">
        <DownloadButton
          onClickCallback={() => window.open(directUrl)}
          btnColor="blue"
          btnText={'Download'}
          btnIcon="file-download"
          btnTitle={'Download the file directly through OneDrive'}
        />
        <DownloadButton
          onClickCallback={() => {
            clipboard.copy(rawFileUrl(asPath, hashedToken, getBaseUrl()))
            toast.success('Copied direct link to clipboard.')
          }}
          btnColor="pink"
          btnText={'Copy direct link'}
          btnIcon="copy"
          btnTitle={'Copy the permalink to the file to the clipboard'}
        />
        <DownloadButton
          onClickCallback={() => setMenuOpen(true)}
          btnColor="teal"
          btnText={'Customise link'}
          btnIcon="pen"
        />
      </div>
    </>
  )
}

export default DownloadButtonGroup
