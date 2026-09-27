import Link from 'next/link'
import { memo } from 'react'
import { useI18n } from '../i18n'
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

const metaClass = 'hidden whitespace-nowrap text-control text-muted-foreground tabular-nums md:block'

const FileListItem = memo(function FileListItem({ fileContent: c }: { fileContent: OdFolderChildren }) {
  return (
    <>
      <div className="flex min-w-0 items-center gap-2.5 pr-2 pl-2 md:pr-0" title={c.name}>
        <ChildIcon child={c} className="w-4.5 shrink-0 text-center text-muted-foreground" />
        <ChildName name={c.name} folder={Boolean(c.folder)} />
      </div>
      <div className={metaClass}>{formatModifiedDateTime(c.lastModifiedDateTime)}</div>
      <div className={`${metaClass} text-right`}>{humanFileSize(c.size)}</div>
    </>
  )
})

const headerClass = 'hidden font-medium text-muted-foreground text-xs md:block'

const FolderListLayout = (props: FolderLayoutProps) => {
  const { path, folderChildren, selected, toggleItemSelected } = props
  const hashedToken = getStoredToken(path)
  const { t } = useI18n()

  return (
    <div className="surface p-1 text-sm sm:rounded-popup">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-y-0.5 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:gap-x-6">
        <div className="col-span-full mb-0.5 box-content grid h-10 grid-cols-subgrid items-center pb-px separator">
          <div className="pl-2 font-medium text-muted-foreground text-xs">{t('Name')}</div>
          <div className={headerClass}>{t('Last Modified')}</div>
          <div className={`${headerClass} text-right`}>{t('Size')}</div>
          <SelectedFilesControls {...props} className="hidden items-center pr-1 md:flex" selectTitle={t('Select files')} />
        </div>

        {folderChildren.map((c: OdFolderChildren) => {
          const itemPath = getItemPath(path, c.name)

          return (
            <div
              className={`col-span-full grid grid-cols-subgrid items-center rounded-item transition-colors duration-(--duration-fast) hover:bg-accent ${
                selected[c.id] ? 'bg-accent' : ''
              }`}
              key={c.id}
            >
              <Link
                href={itemPath}
                passHref
                prefetch={false}
                className="col-span-full grid min-w-0 grid-cols-subgrid items-center py-2 md:col-span-3"
              >
                <FileListItem fileContent={c} />
              </Link>

              <div className="hidden items-center pr-1 md:flex">
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
                      title={t('Select file')}
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
