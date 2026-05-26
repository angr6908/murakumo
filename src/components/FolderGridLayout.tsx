import type { OdFolderChildren } from '../types'

import Link from 'next/link'
import { useState } from 'react'

import { getBaseUrl } from '../utils/getBaseUrl'
import { formatModifiedDateTime } from '../utils/fileDetails'
import { getItemPath } from '../utils/drivePath'
import { thumbnailUrl } from '../utils/odUrls'
import {
  Checkbox,
  ChildIcon,
  ChildName,
  FolderChildActions,
  FolderLayoutProps,
  isSelectableFile,
  SelectedFilesControls,
} from './FolderControls'
import { getStoredToken } from '../utils/protectedRouteHandler'

const GridItem = ({ c, path }: { c: OdFolderChildren; path: string }) => {
  // We use the generated medium thumbnail for rendering preview images (excluding folders)
  const hashedToken = getStoredToken(path)
  const thumbnail = 'folder' in c ? null : thumbnailUrl(path, 'medium', hashedToken)

  // Some thumbnails are broken, so we check for onerror event in the image component
  const [brokenThumbnail, setBrokenThumbnail] = useState(false)

  return (
    <div className="space-y-2">
      <div className="h-32 overflow-hidden rounded border border-gray-900/10 dark:border-gray-500/30">
        {thumbnail && !brokenThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="h-full w-full object-cover object-top"
            src={thumbnail}
            alt={c.name}
            loading="lazy"
            decoding="async"
            onError={() => setBrokenThumbnail(true)}
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center rounded-lg">
            <ChildIcon child={c} />
            <span className="absolute right-0 bottom-0 m-1 font-medium text-gray-700 dark:text-gray-500">
              {c.folder?.childCount}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-start justify-center space-x-2">
        <span className="w-5 flex-shrink-0 text-center">
          <ChildIcon child={c} />
        </span>
        <ChildName name={c.name} folder={Boolean(c.folder)} />
      </div>
      <div className="truncate text-center font-mono text-xs text-gray-700 dark:text-gray-500">
        {formatModifiedDateTime(c.lastModifiedDateTime)}
      </div>
    </div>
  )
}

const FolderGridLayout = ({
  path,
  folderChildren,
  selected,
  toggleItemSelected,
  totalSelected,
  toggleTotalSelected,
  totalGenerating,
  handleSelectedDownload,
  folderGenerating,
  handleSelectedPermalink,
  handleFolderDownload,
  toast,
}: FolderLayoutProps) => {
  const hashedToken = getStoredToken(path)
  const baseUrl = getBaseUrl()
  const itemCount = folderChildren.length

  return (
    <div className="rounded bg-white shadow-sm dark:bg-gray-900 dark:text-gray-100">
      <div className="flex items-center border-b border-gray-900/10 px-3 text-xs font-bold tracking-widest text-gray-600 uppercase dark:border-gray-500/30 dark:text-gray-400">
        <div className="flex-1">{`${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}</div>
        <SelectedFilesControls
          className="flex p-1.5 text-gray-700 dark:text-gray-400"
          selectTitle={'Select all files'}
          totalSelected={totalSelected}
          toggleTotalSelected={toggleTotalSelected}
          totalGenerating={totalGenerating}
          handleSelectedDownload={handleSelectedDownload}
          handleSelectedPermalink={handleSelectedPermalink}
          toast={toast}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-4">
        {folderChildren.map((c: OdFolderChildren) => {
          const itemPath = getItemPath(path, c.name)
          return (
            <div
              key={c.id}
              className="group dark:hover:bg-gray-850 relative overflow-hidden rounded transition-all duration-100 hover:bg-gray-100"
            >
              <div className="absolute top-0 right-0 z-10 m-1 rounded bg-white/50 py-0.5 opacity-0 transition-all duration-100 group-hover:opacity-100 dark:bg-gray-900/50">
                <FolderChildActions
                  child={c}
                  itemPath={itemPath}
                  hashedToken={hashedToken}
                  folderGenerating={folderGenerating}
                  handleFolderDownload={handleFolderDownload}
                  toast={toast}
                  className=""
                  downloadBaseUrl={baseUrl}
                />
              </div>

              <div
                className={`${
                  selected[c.id] ? 'opacity-100' : 'opacity-0'
                } absolute top-0 left-0 z-10 m-1 rounded bg-white/50 py-0.5 group-hover:opacity-100 dark:bg-gray-900/50`}
              >
                {isSelectableFile(c) && (
                  <Checkbox
                    checked={selected[c.id] ? 2 : 0}
                    onChange={() => toggleItemSelected(c.id)}
                    title={'Select file'}
                  />
                )}
              </div>

              <Link href={itemPath} passHref prefetch={false}>
                <GridItem c={c} path={itemPath} />
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FolderGridLayout
