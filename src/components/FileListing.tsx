import { ChevronIcon } from '@videojs/react/icons'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { type FC, type ReactElement, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useI18n } from '../i18n'
import type { OdFileObject, OdFolderObject } from '../types'
import { basename, getItemPath, isNotPersonalVaultItem, type QueryMap, queryToPath } from '../utils/drivePath'
import { useProtectedSWRInfinite } from '../utils/fetchWithSWR'
import { getExtension } from '../utils/getFileIcon'
import { getPreviewType, preview } from '../utils/getPreviewType'
import { rawFileUrl } from '../utils/odUrls'
import { getStoredToken } from '../utils/protectedRouteHandler'
import Auth from './Auth'
import { isSelectableFile } from './FolderControls'
import FolderGridLayout from './FolderGridLayout'
import FolderListLayout from './FolderListLayout'
import FourOhFour from './FourOhFour'
import Loading, { Spinner } from './Loading'
import {
  DownloadingToast,
  downloadMultipleFiles,
  downloadTreelikeMultipleFiles,
  downloadUrl,
  traverseFolder,
} from './MultiFileDownloader'
import { PreviewContainer } from './previews/Containers'
import { useLayout } from './SwitchLayout'

const PreviewLoading = () => {
  const { t } = useI18n()
  return (
    <PreviewContainer>
      <Loading loadingText={t('Loading ...')} />
    </PreviewContainer>
  )
}

const ImagePreview = dynamic(() => import('./previews/ImagePreview'), { loading: PreviewLoading })
const TextPreview = dynamic(() => import('./previews/TextPreview'), { loading: PreviewLoading })
const CodePreview = dynamic(() => import('./previews/CodePreview'), { loading: PreviewLoading })
const MarkdownPreview = dynamic(() => import('./previews/MarkdownPreview'), { loading: PreviewLoading })
const OfficePreview = dynamic(() => import('./previews/OfficePreview'), { loading: PreviewLoading })
const AudioPreview = dynamic(() => import('./previews/AudioPreview'), { loading: PreviewLoading })
const VideoPreview = dynamic(() => import('./previews/VideoPreview'), { loading: PreviewLoading })
const PDFPreview = dynamic(() => import('./previews/PDFPreview'), { loading: PreviewLoading })
const URLPreview = dynamic(() => import('./previews/URLPreview'), { loading: PreviewLoading })
const DefaultPreview = dynamic(() => import('./previews/DefaultPreview'), { loading: PreviewLoading })
const EPUBPreview = dynamic(() => import('./previews/EPUBPreview'), { loading: PreviewLoading, ssr: false })

type PreviewRenderer = (file: OdFileObject, path: string) => ReactElement

const previewRenderers: Record<string, PreviewRenderer> = {
  [preview.image]: file => <ImagePreview file={file} />,
  [preview.text]: () => <TextPreview />,
  [preview.code]: file => <CodePreview file={file} />,
  [preview.markdown]: (file, path) => <MarkdownPreview file={file} path={path} />,
  [preview.video]: file => <VideoPreview file={file} />,
  [preview.audio]: file => <AudioPreview file={file} />,
  [preview.pdf]: file => <PDFPreview file={file} />,
  [preview.office]: file => <OfficePreview file={file} />,
  [preview.epub]: file => <EPUBPreview file={file} />,
  [preview.url]: () => <URLPreview />,
  default: file => <DefaultPreview file={file} />,
}

const renderFilePreview = (file: OdFileObject, path: string) => {
  const previewType = getPreviewType(getExtension(file.name), { video: Boolean(file.video) })
  const renderer = previewType ? previewRenderers[previewType] : undefined
  return (renderer ?? previewRenderers.default)(file, path)
}

type SelectedFiles = Record<string, boolean>
type SelectionState = 0 | 1 | 2

const getSelectionState = (files: OdFolderObject['value'], selected: SelectedFiles): SelectionState => {
  const hasSelected = files.some(file => selected[file.id])
  const hasUnselected = files.some(file => !selected[file.id])

  return hasSelected && hasUnselected ? 1 : hasSelected ? 2 : 0
}

const FileListing: FC<{ query?: QueryMap }> = ({ query }) => {
  const [selected, setSelected] = useState<SelectedFiles>({})
  const [totalGenerating, setTotalGenerating] = useState(false)
  const [folderGenerating, setFolderGenerating] = useState<Record<string, boolean>>({})

  const router = useRouter()
  const { t } = useI18n()
  const [layout] = useLayout()

  const path = queryToPath(query)

  const { data, error, size, setSize, hashedToken } = useProtectedSWRInfinite(path)

  // Derived once per fetched page rather than on every selection toggle — normalising and
  // filtering every child is otherwise repeated on each re-render of the listing.
  const folderView = useMemo(() => {
    if (!data?.length || !data[0] || !('folder' in data[0])) return null

    const allFolderChildren = data.flatMap(r => r.folder.value) as OdFolderObject['value']
    const folderChildren = path === '/' ? allFolderChildren.filter(isNotPersonalVaultItem) : allFolderChildren

    return {
      folderChildren,
      files: folderChildren.filter(isSelectableFile),
      readmeFile: folderChildren.find(c => c.name.toLowerCase() === 'readme.md'),
    }
  }, [data, path])

  if (error) {
    // If error includes 403 which means the user has not completed initial setup, redirect to OAuth page
    if (error.status === 403) {
      router.push('/murakumo-oauth/step-1')
      return <div />
    }

    return (
      <PreviewContainer>
        {error.status === 401 ? <Auth redirect={path} /> : <FourOhFour errorMsg={JSON.stringify(error.message)} />}
      </PreviewContainer>
    )
  }
  if (!data) {
    return (
      <PreviewContainer>
        <Loading loadingText={t('Loading ...')} />
      </PreviewContainer>
    )
  }

  const isLoadingMore = size > 0 && typeof data[size - 1] === 'undefined'
  const isReachingEnd = typeof data[data.length - 1]?.next === 'undefined'
  const onlyOnePage = typeof data[0].next === 'undefined'

  if (folderView) {
    const { folderChildren, files, readmeFile } = folderView
    const totalSelected = getSelectionState(files, selected)

    const toggleItemSelected = (id: string) => {
      const nextSelected = { ...selected }
      if (nextSelected[id]) {
        delete nextSelected[id]
      } else {
        nextSelected[id] = true
      }
      setSelected(nextSelected)
    }

    const toggleTotalSelected = () => {
      setSelected(totalSelected === 2 ? {} : Object.fromEntries(files.map(c => [c.id, true])))
    }

    const handleSelectedDownload = () => {
      const folderName = basename(path)
      const folder = folderName ? decodeURIComponent(folderName) : undefined
      const selectedFiles = files
        .filter(c => selected[c.id])
        .map(c => ({
          name: c.name,
          url: rawFileUrl(getItemPath(path, c.name), hashedToken),
        }))

      if (selectedFiles.length === 1) {
        downloadUrl(selectedFiles[0].url)
      } else if (selectedFiles.length > 1) {
        const toastId = toast.loading(<DownloadingToast router={router} />)
        setTotalGenerating(true)
        downloadMultipleFiles({ toastId, router, files: selectedFiles, folder })
          .then(() => {
            toast.success(t('Finished downloading selected files.'), {
              id: toastId,
            })
          })
          .catch(() => {
            toast.error(t('Failed to download selected files.'), { id: toastId })
          })
          .finally(() => setTotalGenerating(false))
      }
    }

    const handleSelectedPermalink = (baseUrl: string) => {
      return files
        .filter(c => selected[c.id])
        .map(c => rawFileUrl(getItemPath(path, c.name), hashedToken, baseUrl))
        .join('\n')
    }

    const handleFolderDownload = (path: string, id: string, name?: string) => () => {
      const files = (async function* () {
        for await (const { meta: c, path: p, isFolder, error } of traverseFolder(path)) {
          if (error) {
            toast.error(
              t('Failed to download folder {{path}}: {{status}} {{message}} Skipped it to continue.', {
                path: p,
                status: error.status,
                message: error.message,
              }),
            )
            continue
          }
          const hashedTokenForPath = getStoredToken(p)
          yield {
            name: c?.name,
            url: rawFileUrl(p, hashedTokenForPath),
            path: p,
            isFolder,
          }
        }
      })()

      setFolderGenerating(folderGenerating => ({ ...folderGenerating, [id]: true }))
      const toastId = toast.loading(<DownloadingToast router={router} />)

      downloadTreelikeMultipleFiles({
        toastId,
        router,
        files,
        basePath: path,
        folder: name,
      })
        .then(() => {
          toast.success(t('Finished downloading folder.'), { id: toastId })
        })
        .catch(() => {
          toast.error(t('Failed to download folder.'), { id: toastId })
        })
        .finally(() => setFolderGenerating(folderGenerating => ({ ...folderGenerating, [id]: false })))
    }

    const folderProps = {
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
    }

    return (
      <>
        {layout.name === 'Grid' ? <FolderGridLayout {...folderProps} /> : <FolderListLayout {...folderProps} />}

        {!onlyOnePage && (
          <div className="mt-3 flex flex-col items-center gap-2">
            <div className="text-muted-foreground text-xs tabular-nums">
              {t('Showing {{pages}} page(s) of {{files}} file(s)', {
                pages: size,
                files: isLoadingMore ? '...' : folderChildren.length,
              })}
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSize(size + 1)}
              disabled={isLoadingMore || isReachingEnd}
            >
              {isLoadingMore ? (
                <>
                  <Spinner />
                  <span>{t('Loading ...')}</span>
                </>
              ) : isReachingEnd ? (
                <span>{t('No more files')}</span>
              ) : (
                <>
                  <span>{t('Load more')}</span>
                  <ChevronIcon className="size-4 rotate-90" />
                </>
              )}
            </button>
          </div>
        )}

        {readmeFile && (
          <div className="mt-4">
            <MarkdownPreview file={readmeFile} path={path} standalone={false} />
          </div>
        )}
      </>
    )
  }

  if (data.length === 1 && 'file' in data[0]) {
    const file = data[0].file as OdFileObject
    return renderFilePreview(file, path)
  }

  return (
    <PreviewContainer>
      <FourOhFour errorMsg={t('Cannot preview {{path}}', { path })} />
    </PreviewContainer>
  )
}
export default FileListing
