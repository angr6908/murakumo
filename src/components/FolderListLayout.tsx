import type { OdFolderChildren } from '../types'

import Link from 'next/link'
import { FC } from 'react'

import { humanFileSize, formatModifiedDateTime } from '../utils/fileDetails'
import { getItemPath } from '../utils/drivePath'

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

const FileListItem: FC<{ fileContent: OdFolderChildren }> = ({ fileContent: c }) => {
  return (
    <div className="grid cursor-pointer grid-cols-10 items-center space-x-2 px-3 py-2.5">
      <div className="col-span-10 flex items-center space-x-2 truncate md:col-span-6" title={c.name}>
        <div className="w-5 flex-shrink-0 text-center">
          <ChildIcon child={c} />
        </div>
        <ChildName name={c.name} folder={Boolean(c.folder)} />
      </div>
      <div className="col-span-3 hidden flex-shrink-0 font-mono text-sm text-gray-700 md:block dark:text-gray-500">
        {formatModifiedDateTime(c.lastModifiedDateTime)}
      </div>
      <div className="col-span-1 hidden flex-shrink-0 truncate font-mono text-sm text-gray-700 md:block dark:text-gray-500">
        {humanFileSize(c.size)}
      </div>
    </div>
  )
}

const FolderListLayout = ({
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

  return (
    <div className="rounded bg-white shadow-sm dark:bg-gray-900 dark:text-gray-100">
      <div className="grid grid-cols-12 items-center space-x-2 border-b border-gray-900/10 px-3 dark:border-gray-500/30">
        <div className="col-span-12 py-2 text-xs font-bold tracking-widest text-gray-600 uppercase md:col-span-6 dark:text-gray-300">
          {'Name'}
        </div>
        <div className="col-span-3 hidden text-xs font-bold tracking-widest text-gray-600 uppercase md:block dark:text-gray-300">
          {'Last Modified'}
        </div>
        <div className="hidden text-xs font-bold tracking-widest text-gray-600 uppercase md:block dark:text-gray-300">
          {'Size'}
        </div>
        <div className="hidden text-xs font-bold tracking-widest text-gray-600 uppercase md:block dark:text-gray-300">
          {'Actions'}
        </div>
        <div className="hidden text-xs font-bold tracking-widest text-gray-600 uppercase md:block dark:text-gray-300">
          <SelectedFilesControls
            className="hidden p-1.5 text-gray-700 md:flex dark:text-gray-400"
            selectTitle={'Select files'}
            totalSelected={totalSelected}
            toggleTotalSelected={toggleTotalSelected}
            totalGenerating={totalGenerating}
            handleSelectedDownload={handleSelectedDownload}
            handleSelectedPermalink={handleSelectedPermalink}
            toast={toast}
          />
        </div>
      </div>

      {folderChildren.map((c: OdFolderChildren) => {
        const itemPath = getItemPath(path, c.name)

        return (
          <div
            className="dark:hover:bg-gray-850 grid grid-cols-12 transition-all duration-100 hover:bg-gray-100"
            key={c.id}
          >
            <Link href={itemPath} passHref prefetch={false} className="col-span-12 md:col-span-10">
              <FileListItem fileContent={c} />
            </Link>

            <FolderChildActions
              child={c}
              itemPath={itemPath}
              hashedToken={hashedToken}
              folderGenerating={folderGenerating}
              handleFolderDownload={handleFolderDownload}
              toast={toast}
              className="hidden p-1.5 text-gray-700 md:flex dark:text-gray-400"
            />
            <div className="hidden p-1.5 text-gray-700 md:flex dark:text-gray-400">
              {isSelectableFile(c) && (
                <Checkbox
                  checked={selected[c.id] ? 2 : 0}
                  onChange={() => toggleItemSelected(c.id)}
                  title={'Select file'}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default FolderListLayout
