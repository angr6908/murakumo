import Link from 'next/link'
import { memo } from 'react'
import type { OdFolderChildren } from '../types'
import { getItemPath } from '../utils/drivePath'
import { formatModifiedDateTime, humanFileSize } from '../utils/fileDetails'
import { getStoredToken } from '../utils/protectedRouteHandler'
import {
  Checkbox,
  ChildIcon,
  ChildName,
  FolderChildActions,
  type FolderLayoutProps,
  isSelectableFile,
  SelectedFilesControls,
} from './FolderControls'

const FileListItem = memo(function FileListItem({ fileContent: c }: { fileContent: OdFolderChildren }) {
  return (
    <div className="grid grid-cols-10 items-center gap-2 px-2 py-2">
      <div className="col-span-10 flex min-w-0 items-center gap-2.5 md:col-span-6" title={c.name}>
        <ChildIcon child={c} className="w-4.5 shrink-0 text-center text-muted-foreground" />
        <ChildName name={c.name} folder={Boolean(c.folder)} />
      </div>
      <div className="col-span-3 hidden truncate text-control text-muted-foreground tabular-nums md:block">
        {formatModifiedDateTime(c.lastModifiedDateTime)}
      </div>
      <div className="col-span-1 hidden truncate text-control text-muted-foreground tabular-nums md:block">
        {humanFileSize(c.size)}
      </div>
    </div>
  )
})

const headerClass = 'hidden font-medium text-muted-foreground text-xs md:block'

const FolderListLayout = (props: FolderLayoutProps) => {
  const { path, folderChildren, selected, toggleItemSelected } = props
  const hashedToken = getStoredToken(path)

  return (
    <div className="surface p-1 text-sm sm:rounded-popup">
      <div className="grid grid-cols-12 items-center separator">
        <div className="col-span-12 grid h-10 grid-cols-10 items-center gap-2 px-2 md:col-span-10">
          <div className="col-span-10 font-medium text-muted-foreground text-xs md:col-span-6">{'Name'}</div>
          <div className={`col-span-3 ${headerClass}`}>{'Last Modified'}</div>
          <div className={`col-span-1 ${headerClass}`}>{'Size'}</div>
        </div>
        <SelectedFilesControls
          {...props}
          className="col-span-2 hidden items-center justify-end pr-1 md:flex"
          selectTitle={'Select files'}
        />
      </div>

      <div className="mt-1 flex flex-col gap-0.5">
        {folderChildren.map((c: OdFolderChildren) => {
          const itemPath = getItemPath(path, c.name)

          return (
            <div
              className={`grid grid-cols-12 items-center rounded-item transition-colors duration-(--duration-fast) hover:bg-accent ${
                selected[c.id] ? 'bg-accent' : ''
              }`}
              key={c.id}
            >
              <Link href={itemPath} passHref prefetch={false} className="col-span-12 min-w-0 md:col-span-10">
                <FileListItem fileContent={c} />
              </Link>

              <div className="col-span-2 hidden items-center justify-end pr-1 md:flex">
                <FolderChildActions
                  {...props}
                  child={c}
                  itemPath={itemPath}
                  hashedToken={hashedToken}
                  className="flex items-center"
                />
                <div className="flex w-8 justify-center">
                  {isSelectableFile(c) && (
                    <Checkbox
                      checked={selected[c.id] ? 2 : 0}
                      onChange={() => toggleItemSelected(c.id)}
                      title={'Select file'}
                    />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FolderListLayout
