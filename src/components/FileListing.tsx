import type { OdFileObject, OdFolderObject } from '../types'
import { ParsedUrlQuery } from 'querystring'
import { FC, ReactElement, useState } from 'react'
import { FontAwesomeIcon } from '../utils/fontawesome'
import toast, { Toaster } from 'react-hot-toast'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'

import useLocalStorage from '../utils/useLocalStorage'
import { getPreviewType, preview } from '../utils/getPreviewType'
import { useProtectedSWRInfinite } from '../utils/fetchWithSWR'
import { getExtension } from '../utils/getFileIcon'
import { getItemPath, queryToPath, isNotPersonalVaultItem } from '../utils/drivePath'
import { rawFileUrl } from '../utils/odUrls'
import { getStoredToken } from '../utils/protectedRouteHandler'
import {
  DownloadingToast,
  downloadMultipleFiles,
  downloadTreelikeMultipleFiles,
  downloadUrl,
  traverseFolder,
} from './MultiFileDownloader'

import { layouts } from './SwitchLayout'
import Loading, { LoadingIcon } from './Loading'
import FourOhFour from './FourOhFour'
import Auth from './Auth'
import { PreviewContainer } from './previews/Containers'

import FolderListLayout from './FolderListLayout'
import FolderGridLayout from './FolderGridLayout'
import { isSelectableFile } from './FolderControls'

const PreviewLoading = () => (
  <PreviewContainer>
    <Loading loadingText={'Loading ...'} />
  </PreviewContainer>
)

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
  [preview.text]: file => <TextPreview file={file} />,
  [preview.code]: file => <CodePreview file={file} />,
  [preview.markdown]: (file, path) => <MarkdownPreview file={file} path={path} />,
  [preview.video]: file => <VideoPreview file={file} />,
  [preview.audio]: file => <AudioPreview file={file} />,
  [preview.pdf]: file => <PDFPreview file={file} />,
  [preview.office]: file => <OfficePreview file={file} />,
  [preview.epub]: file => <EPUBPreview file={file} />,
  [preview.url]: file => <URLPreview file={file} />,
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
  const selectedStates = files.map(file => Boolean(selected[file.id]))
  const hasSelected = selectedStates.some(Boolean)
  const hasUnselected = selectedStates.some(isSelected => !isSelected)

  return hasSelected && hasUnselected ? 1 : !hasUnselected ? 2 : 0
}

const FileListing: FC<{ query?: ParsedUrlQuery }> = ({ query }) => {
  const [selected, setSelected] = useState<SelectedFiles>({})
  const [totalSelected, setTotalSelected] = useState<SelectionState>(0)
  const [totalGenerating, setTotalGenerating] = useState(false)
  const [folderGenerating, setFolderGenerating] = useState<Record<string, boolean>>({})

  const router = useRouter()
  const hashedToken = getStoredToken(router.asPath)
  const [layout] = useLocalStorage('preferredLayout', layouts[0])

  const path = queryToPath(query)

  const { data, error, size, setSize } = useProtectedSWRInfinite(path)

  if (error) {
    // If error includes 403 which means the user has not completed initial setup, redirect to OAuth page
    if (error.status === 403) {
      router.push('/onedrive-vercel-index-plus-oauth/step-1')
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
        <Loading loadingText={'Loading ...'} />
      </PreviewContainer>
    )
  }

  const responses = data.flat()

  const isLoadingMore = size > 0 && typeof data[size - 1] === 'undefined'
  const isEmpty = data?.[0]?.length === 0
  const isReachingEnd = isEmpty || typeof data[data.length - 1]?.next === 'undefined'
  const onlyOnePage = typeof data[0].next === 'undefined'

  if ('folder' in responses[0]) {
    const allFolderChildren = responses.flatMap(r => r.folder.value) as OdFolderObject['value']
    const folderChildren = path === '/' ? allFolderChildren.filter(isNotPersonalVaultItem) : allFolderChildren
    const files = folderChildren.filter(isSelectableFile)

    const readmeFile = folderChildren.find(c => c.name.toLowerCase() === 'readme.md')

    const toggleItemSelected = (id: string) => {
      const nextSelected = { ...selected }
      if (nextSelected[id]) {
        delete nextSelected[id]
      } else {
        nextSelected[id] = true
      }
      setSelected(nextSelected)
      setTotalSelected(getSelectionState(files, nextSelected))
    }

    const toggleTotalSelected = () => {
      if (getSelectionState(files, selected) === 2) {
        setSelected({})
        setTotalSelected(0)
      } else {
        setSelected(Object.fromEntries(files.map(c => [c.id, true])))
        setTotalSelected(2)
      }
    }

    const handleSelectedDownload = () => {
      const folderName = path.substring(path.lastIndexOf('/') + 1)
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
            toast.success('Finished downloading selected files.', {
              id: toastId,
            })
          })
          .catch(() => {
            toast.error('Failed to download selected files.', { id: toastId })
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
            toast.error(`Failed to download folder ${p}: ${error.status} ${error.message} Skipped it to continue.`)
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
          toast.success('Finished downloading folder.', { id: toastId })
        })
        .catch(() => {
          toast.error('Failed to download folder.', { id: toastId })
        })
        .finally(() => setFolderGenerating(folderGenerating => ({ ...folderGenerating, [id]: false })))
    }

    const folderProps = {
      toast,
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
        <Toaster />

        {layout.name === 'Grid' ? <FolderGridLayout {...folderProps} /> : <FolderListLayout {...folderProps} />}

        {!onlyOnePage && (
          <div className="rounded-b bg-white dark:bg-gray-900 dark:text-gray-100">
            <div className="border-b border-gray-200 p-3 text-center font-mono text-sm text-gray-400 dark:border-gray-700">
              {`- showing ${size} page(s) ` +
                (isLoadingMore ? `of ... file(s) -` : `of ${folderChildren.length} file(s) -`)}
            </div>
            <button
              className={`flex w-full items-center justify-center space-x-2 p-3 disabled:cursor-not-allowed ${
                isLoadingMore || isReachingEnd ? 'opacity-60' : 'dark:hover:bg-gray-850 hover:bg-gray-100'
              }`}
              onClick={() => setSize(size + 1)}
              disabled={isLoadingMore || isReachingEnd}
            >
              {isLoadingMore ? (
                <>
                  <LoadingIcon className="inline-block h-4 w-4 animate-spin" />
                  <span>{'Loading ...'}</span>{' '}
                </>
              ) : isReachingEnd ? (
                <span>{'No more files'}</span>
              ) : (
                <>
                  <span>{'Load more'}</span>
                  <FontAwesomeIcon icon="chevron-circle-down" />
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

  if ('file' in responses[0] && responses.length === 1) {
    const file = responses[0].file as OdFileObject
    return renderFilePreview(file, path)
  }

  return (
    <PreviewContainer>
      <FourOhFour errorMsg={'Cannot preview {{path}}'} />
    </PreviewContainer>
  )
}
export default FileListing
