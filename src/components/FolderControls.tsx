import { Download, Folder, Link, type LucideIcon } from 'lucide-react'
import { type FC, type MouseEventHandler, useEffect, useRef } from 'react'
import { useI18n } from '../i18n'
import type { OdDriveItemBase } from '../types'

import { getRawExtension } from '../utils/fileType'
import { getBaseUrl } from '../utils/getBaseUrl'
import { getFileIcon } from '../utils/getFileIcon'
import { rawFileUrl } from '../utils/odUrls'
import { useCopyLink } from '../utils/useCopyLink'
import { Spinner } from './Loading'
import Tip from './Tip'

export type SelectionState = 0 | 1 | 2

export type FolderLayoutProps = {
  path: string
  hashedToken: string | null
  folderChildren: OdDriveItemBase[]
  selected: Record<string, boolean>
  toggleItemSelected: (id: string) => void
  totalSelected: SelectionState
  toggleTotalSelected: () => void
  totalGenerating: boolean
  handleSelectedDownload: () => void
  folderGenerating: Record<string, boolean>
  handleSelectedPermalink: (baseUrl: string) => string
  handleFolderDownload: (path: string, id: string, name?: string) => () => void
}

const iconButtonClass = 'btn btn-icon btn-sm text-muted-foreground hover:text-foreground'

const IconButton: FC<{ label: string; icon: LucideIcon; disabled?: boolean; onClick: () => void }> = ({
  label,
  icon: Icon,
  disabled,
  onClick,
}) => (
  <Tip label={label}>
    <button type="button" className={iconButtonClass} aria-label={label} disabled={disabled} onClick={onClick}>
      <Icon className="size-4" />
    </button>
  </Tip>
)
const emojiSegmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null
const emojiPattern = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u

const firstGrapheme = (value: string) => {
  if (emojiSegmenter) return emojiSegmenter.segment(value)[Symbol.iterator]().next().value?.segment ?? ''
  return Array.from(value)[0] ?? ''
}

const leadingEmoji = (name: string) => {
  const emoji = firstGrapheme(name)
  return emojiPattern.test(emoji) ? emoji : ''
}

const formatChildName = (name: string) => {
  const emoji = leadingEmoji(name)
  return emoji ? name.slice(emoji.length).trim() : name
}

export const isSelectableFile = (child: OdDriveItemBase) => !child.folder && child.name !== '.password'

export const ChildName: FC<{ name: string; folder?: boolean }> = ({ name, folder }) => {
  const original = formatChildName(name)
  const extension = folder ? '' : getRawExtension(original)
  const prename = original.slice(0, original.length - extension.length)

  return (
    <span className="truncate before:float-right before:content-[attr(data-tail)]" data-tail={extension}>
      {prename}
    </span>
  )
}

export const ChildIcon: FC<{ child: OdDriveItemBase; className?: string }> = ({ child, className }) => {
  const emoji = leadingEmoji(child.name)
  if (emoji) return <span className={className}>{emoji}</span>
  const Icon = child.file ? getFileIcon(child.name, { video: Boolean(child.video) }) : Folder
  return <Icon className={className} />
}

export const Checkbox: FC<{
  checked: SelectionState
  onChange: () => void
  title: string
}> = ({ checked, onChange, title }) => {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = checked === 1
  }, [checked])

  const handleClick: MouseEventHandler = e => {
    if (e.target === ref.current) {
      e.stopPropagation()
    } else {
      ref.current?.click()
    }
  }

  return (
    <Tip label={title}>
      <span className="btn btn-icon btn-sm" onClick={handleClick}>
        <input
          className="size-4 cursor-pointer accent-foreground"
          type="checkbox"
          checked={Boolean(checked)}
          ref={ref}
          aria-label={title}
          onChange={onChange}
        />
      </span>
    </Tip>
  )
}

const Downloading: FC<{ title: string }> = ({ title }) => (
  <Tip label={title}>
    <span className="btn btn-icon btn-sm text-muted-foreground" role="status" aria-label={title}>
      <Spinner />
    </span>
  </Tip>
)

export function SelectedFilesControls({
  className,
  selectTitle,
  totalSelected,
  toggleTotalSelected,
  totalGenerating,
  handleSelectedDownload,
  handleSelectedPermalink,
}: Pick<
  FolderLayoutProps,
  'totalSelected' | 'toggleTotalSelected' | 'totalGenerating' | 'handleSelectedDownload' | 'handleSelectedPermalink'
> & {
  className: string
  selectTitle: string
}) {
  const copyLink = useCopyLink()
  const { t } = useI18n()

  return (
    <div className={className}>
      <IconButton
        label={t('Copy selected files permalink')}
        icon={Link}
        disabled={totalSelected === 0}
        onClick={() => copyLink(handleSelectedPermalink(getBaseUrl()), t('Copied selected files permalink.'))}
      />
      {totalGenerating ? (
        <Downloading title={t('Downloading selected files, refresh page to cancel')} />
      ) : (
        <IconButton
          label={t('Download selected files')}
          icon={Download}
          disabled={totalSelected === 0}
          onClick={handleSelectedDownload}
        />
      )}
      <Checkbox checked={totalSelected} onChange={toggleTotalSelected} title={selectTitle} />
    </div>
  )
}

export function FolderChildActions({
  child,
  itemPath,
  hashedToken,
  folderGenerating,
  handleFolderDownload,
  className,
}: Pick<FolderLayoutProps, 'hashedToken' | 'folderGenerating' | 'handleFolderDownload'> & {
  child: OdDriveItemBase
  itemPath: string
  className: string
}) {
  const copyLink = useCopyLink()
  const { t } = useI18n()

  return (
    <div className={className}>
      {child.folder ? (
        <>
          <IconButton
            label={t('Copy folder permalink')}
            icon={Link}
            onClick={() => copyLink(`${getBaseUrl()}${itemPath}`, t('Copied folder permalink.'))}
          />
          {folderGenerating[child.id] ? (
            <Downloading title={t('Downloading folder, refresh page to cancel')} />
          ) : (
            <IconButton
              label={t('Download folder')}
              icon={Download}
              onClick={handleFolderDownload(itemPath, child.id, child.name)}
            />
          )}
        </>
      ) : (
        <>
          <IconButton
            label={t('Copy raw file permalink')}
            icon={Link}
            onClick={() => copyLink(rawFileUrl(itemPath, hashedToken, getBaseUrl()), t('Copied raw file permalink.'))}
          />
          <Tip label={t('Download file')}>
            <a className={iconButtonClass} aria-label={t('Download file')} href={rawFileUrl(itemPath, hashedToken)}>
              <Download className="size-4" />
            </a>
          </Tip>
        </>
      )}
    </div>
  )
}
