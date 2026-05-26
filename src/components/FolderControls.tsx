import type { OdFolderChildren, OdFolderObject } from '../types'

import { FC, MouseEventHandler, useEffect, useRef } from 'react'
import { useClipboard } from 'use-clipboard-copy'

import { FontAwesomeIcon } from '../utils/fontawesome'
import { getBaseUrl } from '../utils/getBaseUrl'
import { getFileIcon, getRawExtension } from '../utils/getFileIcon'
import { rawFileUrl } from '../utils/odUrls'
import { LoadingIcon } from './Loading'

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
  toast: any
}

const actionButtonClass =
  'cursor-pointer rounded p-1.5 hover:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-white dark:hover:bg-gray-600 disabled:dark:text-gray-600 disabled:hover:dark:bg-gray-900'
const itemActionClass = 'cursor-pointer rounded px-1.5 py-1 hover:bg-gray-300 dark:hover:bg-gray-600'
const emojiSegmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null
const emojiPattern = (() => {
  try {
    return new RegExp('\\p{Extended_Pictographic}|\\p{Regional_Indicator}', 'u')
  } catch {
    return /[\uD800-\uDBFF][\uDC00-\uDFFF]/
  }
})()

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

export const ChildIcon: FC<{ child: OdFolderChildren }> = ({ child }) => {
  const emoji = leadingEmoji(child.name)
  return emoji ? (
    <span>{emoji}</span>
  ) : (
    <FontAwesomeIcon icon={child.file ? getFileIcon(child.name, { video: Boolean(child.video) }) : ['far', 'folder']} />
  )
}

export const Checkbox: FC<{
  checked: 0 | 1 | 2
  onChange: () => void
  title: string
  indeterminate?: boolean
}> = ({ checked, onChange, title, indeterminate }) => {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate && checked === 1)
  }, [checked, indeterminate])

  const handleClick: MouseEventHandler = e => {
    if (e.target === ref.current) {
      e.stopPropagation()
    } else {
      ref.current?.click()
    }
  }

  return (
    <span
      title={title}
      className="inline-flex cursor-pointer items-center rounded p-1.5 hover:bg-gray-300 dark:hover:bg-gray-600"
      onClick={handleClick}
    >
      <input
        className="form-check-input cursor-pointer"
        type="checkbox"
        checked={Boolean(checked)}
        ref={ref}
        aria-label={title}
        onChange={onChange}
      />
    </span>
  )
}

export const Downloading: FC<{ title: string; style: string }> = ({ title, style }) => (
  <span title={title} className={`${style} rounded`} role="status">
    <LoadingIcon className="svg-inline--fa inline-block h-4 w-4 animate-spin" />
  </span>
)

export function SelectedFilesControls({
  className,
  selectTitle,
  totalSelected,
  toggleTotalSelected,
  totalGenerating,
  handleSelectedDownload,
  handleSelectedPermalink,
  toast,
}: Pick<
  FolderLayoutProps,
  | 'totalSelected'
  | 'toggleTotalSelected'
  | 'totalGenerating'
  | 'handleSelectedDownload'
  | 'handleSelectedPermalink'
  | 'toast'
> & {
  className: string
  selectTitle: string
}) {
  const clipboard = useClipboard()

  return (
    <div className={className}>
      <Checkbox checked={totalSelected} onChange={toggleTotalSelected} indeterminate title={selectTitle} />
      <button
        title={'Copy selected files permalink'}
        className={actionButtonClass}
        disabled={totalSelected === 0}
        onClick={() => {
          clipboard.copy(handleSelectedPermalink(getBaseUrl()))
          toast.success('Copied selected files permalink.')
        }}
      >
        <FontAwesomeIcon icon={['far', 'copy']} size="lg" />
      </button>
      {totalGenerating ? (
        <Downloading title={'Downloading selected files, refresh page to cancel'} style="p-1.5" />
      ) : (
        <button
          title={'Download selected files'}
          className={actionButtonClass}
          disabled={totalSelected === 0}
          onClick={handleSelectedDownload}
        >
          <FontAwesomeIcon icon={['far', 'arrow-alt-circle-down']} size="lg" />
        </button>
      )}
    </div>
  )
}

export function FolderChildActions({
  child,
  itemPath,
  hashedToken,
  folderGenerating,
  handleFolderDownload,
  toast,
  className,
  downloadBaseUrl = '',
}: Pick<FolderLayoutProps, 'folderGenerating' | 'handleFolderDownload' | 'toast'> & {
  child: OdFolderChildren
  itemPath: string
  hashedToken: string | null
  className: string
  downloadBaseUrl?: string
}) {
  const clipboard = useClipboard()

  return (
    <div className={className}>
      {child.folder ? (
        <>
          <span
            title={'Copy folder permalink'}
            className={itemActionClass}
            onClick={() => {
              clipboard.copy(`${getBaseUrl()}${itemPath}`)
              toast('Copied folder permalink.', { icon: '👌' })
            }}
          >
            <FontAwesomeIcon icon={['far', 'copy']} />
          </span>
          {folderGenerating[child.id] ? (
            <Downloading title={'Downloading folder, refresh page to cancel'} style="px-1.5 py-1" />
          ) : (
            <span
              title={'Download folder'}
              className={itemActionClass}
              onClick={handleFolderDownload(itemPath, child.id, child.name)}
            >
              <FontAwesomeIcon icon={['far', 'arrow-alt-circle-down']} />
            </span>
          )}
        </>
      ) : (
        <>
          <span
            title={'Copy raw file permalink'}
            className={itemActionClass}
            onClick={() => {
              clipboard.copy(rawFileUrl(itemPath, hashedToken, getBaseUrl()))
              toast.success('Copied raw file permalink.')
            }}
          >
            <FontAwesomeIcon icon={['far', 'copy']} />
          </span>
          <a
            title={'Download file'}
            className={itemActionClass}
            href={rawFileUrl(itemPath, hashedToken, downloadBaseUrl)}
          >
            <FontAwesomeIcon icon={['far', 'arrow-alt-circle-down']} />
          </a>
        </>
      )}
    </div>
  )
}
