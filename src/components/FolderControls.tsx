import { Download, Folder, Link } from 'lucide-react'
import { type FC, type MouseEventHandler, useEffect, useRef } from 'react'
import type { OdFolderChildren, OdFolderObject } from '../types'

import { getBaseUrl } from '../utils/getBaseUrl'
import { getFileIcon, getRawExtension } from '../utils/getFileIcon'
import { rawFileUrl } from '../utils/odUrls'
import { useCopyLink } from '../utils/useCopyLink'
import { Spinner } from './Loading'
import Tip from './Tip'

export type FolderLayoutProps = {
  path: string
  folderChildren: OdFolderObject['value']
  selected: Record<string, boolean>
  toggleItemSelected: (id: string) => void
  totalSelected: 0 | 1 | 2
  toggleTotalSelected: () => void
  totalGenerating: boolean
  handleSelectedDownload: () => void
  folderGenerating: Record<string, boolean>
  handleSelectedPermalink: (baseUrl: string) => string
  handleFolderDownload: (path: string, id: string, name?: string) => () => void
}

const iconButtonClass = 'btn btn-icon btn-sm text-muted-foreground hover:text-foreground'
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

export const isSelectableFile = (child: OdFolderChildren) => !child.folder && child.name !== '.password'

export const ChildName: FC<{ name: string; folder?: boolean }> = ({ name, folder }) => {
  const original = formatChildName(name)
  const extension = folder ? '' : getRawExtension(original)
  const prename = folder ? original : original.substring(0, original.length - extension.length)

  return (
    <span className="truncate before:float-right before:content-[attr(data-tail)]" data-tail={extension}>
      {prename}
    </span>
  )
}

export const ChildIcon: FC<{ child: OdFolderChildren; className?: string }> = ({ child, className }) => {
  const emoji = leadingEmoji(child.name)
  if (emoji) return <span className={className}>{emoji}</span>
  const Icon = child.file ? getFileIcon(child.name, { video: Boolean(child.video) }) : Folder
  return <Icon className={className} />
}

export const Checkbox: FC<{
  checked: 0 | 1 | 2
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

export const Downloading: FC<{ title: string }> = ({ title }) => (
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

  return (
    <div className={className}>
      <Tip label={'Copy selected files permalink'}>
        <button
          type="button"
          className={iconButtonClass}
          aria-label="Copy selected files permalink"
          disabled={totalSelected === 0}
          onClick={() => copyLink(handleSelectedPermalink(getBaseUrl()), 'Copied selected files permalink.')}
        >
          <Link className="size-4" />
        </button>
      </Tip>
      {totalGenerating ? (
        <Downloading title={'Downloading selected files, refresh page to cancel'} />
      ) : (
        <Tip label={'Download selected files'}>
          <button
            type="button"
            className={iconButtonClass}
            aria-label="Download selected files"
            disabled={totalSelected === 0}
            onClick={handleSelectedDownload}
          >
            <Download className="size-4" />
          </button>
        </Tip>
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
  downloadBaseUrl = '',
}: Pick<FolderLayoutProps, 'folderGenerating' | 'handleFolderDownload'> & {
  child: OdFolderChildren
  itemPath: string
  hashedToken: string | null
  className: string
  downloadBaseUrl?: string
}) {
  const copyLink = useCopyLink()

  return (
    <div className={className}>
      {child.folder ? (
        <>
          <Tip label={'Copy folder permalink'}>
            <button
              type="button"
              className={iconButtonClass}
              aria-label="Copy folder permalink"
              onClick={() => copyLink(`${getBaseUrl()}${itemPath}`, 'Copied folder permalink.')}
            >
              <Link className="size-4" />
            </button>
          </Tip>
          {folderGenerating[child.id] ? (
            <Downloading title={'Downloading folder, refresh page to cancel'} />
          ) : (
            <Tip label={'Download folder'}>
              <button
                type="button"
                className={iconButtonClass}
                aria-label="Download folder"
                onClick={handleFolderDownload(itemPath, child.id, child.name)}
              >
                <Download className="size-4" />
              </button>
            </Tip>
          )}
        </>
      ) : (
        <>
          <Tip label={'Copy raw file permalink'}>
            <button
              type="button"
              className={iconButtonClass}
              aria-label="Copy raw file permalink"
              onClick={() => copyLink(rawFileUrl(itemPath, hashedToken, getBaseUrl()), 'Copied raw file permalink.')}
            >
              <Link className="size-4" />
            </button>
          </Tip>
          <Tip label={'Download file'}>
            <a
              className={iconButtonClass}
              aria-label="Download file"
              href={rawFileUrl(itemPath, hashedToken, downloadBaseUrl)}
            >
              <Download className="size-4" />
            </a>
          </Tip>
        </>
      )}
    </div>
  )
}
