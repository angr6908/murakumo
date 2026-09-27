import { Download, Link, type LucideIcon } from 'lucide-react'
import Image from 'next/image'
import type { MouseEventHandler, ReactNode } from 'react'

import { getBaseUrl } from '../utils/getBaseUrl'
import { rawFileUrl } from '../utils/odUrls'
import { useCopyLink } from '../utils/useCopyLink'
import { useCurrentPathToken } from '../utils/useCurrentPathToken'

export const DownloadButton = ({
  onClickCallback,
  primary,
  btnText,
  btnIcon: Icon,
  btnImage,
}: {
  onClickCallback: MouseEventHandler<HTMLButtonElement>
  primary?: boolean
  btnText: string
  btnIcon?: LucideIcon
  btnImage?: string
}) => {
  return (
    <button
      type="button"
      className={`btn ${primary ? 'btn-primary' : 'btn-secondary'} ${Icon || btnImage ? 'pl-3' : ''}`}
      onClick={onClickCallback}
    >
      {Icon && <Icon className="size-4" />}
      {btnImage && <Image className="rounded-[5px]" src={btnImage} alt="" width={18} height={18} />}
      <span>{btnText}</span>
    </button>
  )
}

/** Download / copy link, plus any preview specific buttons passed as children. */
const DownloadButtonGroup = ({
  children,
  className = 'justify-center gap-2',
}: {
  children?: ReactNode
  className?: string
}) => {
  const { asPath, hashedToken } = useCurrentPathToken()

  const copyLink = useCopyLink()
  const directUrl = rawFileUrl(asPath, hashedToken)

  return (
    <div className={`flex flex-wrap ${className}`}>
      <DownloadButton
        onClickCallback={() => window.open(directUrl)}
        primary
        btnText={'Download'}
        btnIcon={Download}
      />
      <DownloadButton
        onClickCallback={() =>
          copyLink(rawFileUrl(asPath, hashedToken, getBaseUrl()), 'Copied direct link to clipboard.')
        }
        btnText={'Copy direct link'}
        btnIcon={Link}
      />
      {children}
    </div>
  )
}

export default DownloadButtonGroup
