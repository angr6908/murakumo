import Link from 'next/link'
import { memo, useState } from 'react'
import { useI18n } from '../i18n'
import type { OdFolderChildren } from '../types'
import { getItemPath } from '../utils/drivePath'
import { formatModifiedDateTime } from '../utils/fileDetails'
import { getBaseUrl } from '../utils/getBaseUrl'
import { thumbnailUrl } from '../utils/odUrls'
import { getStoredToken } from '../utils/protectedRouteHandler'
import { useItemHover } from '../utils/useItemHover'
import {
  Checkbox,
  ChildIcon,
  ChildName,
  FolderChildActions,
  type FolderLayoutProps,
  isSelectableFile,
  SelectedFilesControls,
} from './FolderControls'

const GridItem = memo(function GridItem({ c, path }: { c: OdFolderChildren; path: string }) {
  // We use the generated medium thumbnail for rendering preview images (excluding folders)
  const hashedToken = getStoredToken(path)
  const thumbnail = 'folder' in c ? null : thumbnailUrl(path, 'medium', hashedToken)

  // Some thumbnails are broken, so we check for onerror event in the image component
  const [brokenThumbnail, setBrokenThumbnail] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-32 overflow-hidden rounded-item bg-well shadow-[inset_0_0_0_1px_var(--color-border)]">
        {thumbnail && !brokenThumbnail ? (
          <img
            className="size-full object-cover object-top"
            src={thumbnail}
            alt={c.name}
            loading="lazy"
            decoding="async"
            onError={() => setBrokenThumbnail(true)}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <ChildIcon child={c} className="size-8 text-2xl leading-none" />
            {c.folder?.childCount !== undefined && (
              <span className="absolute right-2 bottom-1.5 font-medium text-xs tabular-nums">
                {c.folder.childCount}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex min-w-0 items-center justify-center gap-2 px-1">
        <ChildIcon child={c} className="w-4.5 shrink-0 text-center text-muted-foreground" />
        <ChildName name={c.name} folder={Boolean(c.folder)} />
      </div>
      <div className="truncate px-1 text-center text-muted-foreground text-xs tabular-nums">
        {formatModifiedDateTime(c.lastModifiedDateTime)}
      </div>
    </div>
  )
})

const FolderGridLayout = (props: FolderLayoutProps) => {
  const { path, folderChildren, selected, toggleItemSelected } = props
  const hashedToken = getStoredToken(path)
  const baseUrl = getBaseUrl()
  const itemCount = folderChildren.length
  const { t } = useI18n()
  const gridRef = useItemHover<HTMLDivElement>()

  return (
    <div className="surface p-1 text-sm sm:rounded-popup">
      <div className="box-content flex h-10 items-center pr-1 pb-px pl-2 separator">
        <div className="flex-1 font-medium text-muted-foreground text-xs tabular-nums">
          {t('{{count}} items', { count: itemCount })}
        </div>
        <SelectedFilesControls {...props} className="flex items-center" selectTitle={t('Select all files')} />
      </div>

      <div
        ref={gridRef}
        className="hover-list mt-1 grid grid-cols-2 gap-1 [--item-radius:var(--radius-popup)] md:grid-cols-4"
      >
        {folderChildren.map((c: OdFolderChildren) => {
          const itemPath = getItemPath(path, c.name)
          return (
            <div key={c.id} className="group relative p-1.5 pb-2" data-item data-selected={selected[c.id] || undefined}>
              <div className="reveal surface-controls absolute top-2.5 right-2.5 z-10 flex rounded-full">
                <FolderChildActions
                  {...props}
                  child={c}
                  itemPath={itemPath}
                  hashedToken={hashedToken}
                  className="flex"
                  downloadBaseUrl={baseUrl}
                />
              </div>

              {isSelectableFile(c) && (
                <div
                  className="reveal surface-controls absolute top-2.5 left-2.5 z-10 flex rounded-full"
                  data-visible={selected[c.id] || undefined}
                >
                  <Checkbox
                    checked={selected[c.id] ? 2 : 0}
                    onChange={() => toggleItemSelected(c.id)}
                    title={t('Select file')}
                  />
                </div>
              )}

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
