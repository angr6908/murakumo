import { NextRouter } from 'next/router'
import toast from 'react-hot-toast'

import { fetcher } from '../utils/fetchWithSWR'
import { getItemPath } from '../utils/drivePath'
import { getStoredToken } from '../utils/protectedRouteHandler'

export function DownloadingToast({ router, progress }: { router: NextRouter; progress?: string }) {
  return (
    <div className="flex items-center space-x-2">
      <div className="w-56">
        <span>{progress ? 'Downloading {{progress}}%' : 'Downloading selected files...'}</span>

        <div className="relative mt-2">
          <div className="flex h-1 overflow-hidden rounded bg-gray-100">
            <div style={{ width: `${progress}%` }} className="bg-gray-500 text-white transition-all duration-100"></div>
          </div>
        </div>
      </div>
      <button className="rounded bg-red-500 p-2 text-white hover:bg-red-400" onClick={() => router.reload()}>
        {'Cancel'}
      </button>
    </div>
  )
}

export function downloadUrl(url: string, name?: string) {
  const el = document.createElement('a')
  el.style.display = 'none'
  document.body.appendChild(el)
  el.href = url
  if (name) el.download = name
  el.click()
  el.remove()
}

export function downloadBlob({ blob, name }: { blob: Blob; name: string }) {
  const bUrl = window.URL.createObjectURL(blob)
  downloadUrl(bUrl, name)
  window.URL.revokeObjectURL(bUrl)
}

const zipName = (folder?: string) => (folder ? folder + '.zip' : 'download.zip')
const updateProgress = (toastId: string, router: NextRouter) => (metadata: { percent: number }) => {
  toast.loading(<DownloadingToast router={router} progress={metadata.percent.toFixed(0)} />, { id: toastId })
}
const createZip = async () => new (await import('jszip')).default()

export async function downloadMultipleFiles({
  toastId,
  router,
  files,
  folder,
}: {
  toastId: string
  router: NextRouter
  files: { name: string; url: string }[]
  folder?: string
}): Promise<void> {
  const zip = await createZip()
  const dir = folder ? zip.folder(folder)! : zip

  files.forEach(({ name, url }) => {
    dir.file(
      name,
      fetch(url).then(r => r.blob()),
    )
  })

  const b = await zip.generateAsync({ type: 'blob' }, updateProgress(toastId, router))
  downloadBlob({ blob: b, name: zipName(folder) })
}

export async function downloadTreelikeMultipleFiles({
  toastId,
  router,
  files,
  basePath,
  folder,
}: {
  toastId: string
  router: NextRouter
  files: AsyncGenerator<{
    name: string
    url?: string
    path: string
    isFolder: boolean
  }>
  basePath: string
  folder?: string
}): Promise<void> {
  const zip = await createZip()
  const root = folder ? zip.folder(folder)! : zip
  const map = [{ path: basePath, dir: root }]

  // Add selected file blobs to zip according to its path
  for await (const { name, url, path, isFolder } of files) {
    const i = map
      .slice()
      .reverse()
      .findIndex(({ path: parent }) => isDirectChild(parent, path))
    if (i === -1) throw new Error('File array does not satisfy requirement')

    const dir = map[map.length - 1 - i].dir
    if (isFolder) {
      map.push({ path, dir: dir.folder(name)! })
    } else {
      dir.file(name, fetch(url!).then(r => r.blob()))
    }
  }

  const b = await zip.generateAsync({ type: 'blob' }, updateProgress(toastId, router))
  downloadBlob({ blob: b, name: zipName(folder) })
}

interface TraverseItem {
  path: string
  meta: any
  isFolder: boolean
  error?: { status: number; message: string }
}

const isDirectChild = (parent: string, child: string) =>
  child.substring(0, parent.length) === parent && child.substring(parent.length + 1).indexOf('/') === -1

export async function* traverseFolder(path: string): AsyncGenerator<TraverseItem, void, undefined> {
  const hashedToken = getStoredToken(path)

  const genTask = async (i: number, path: string, next?: string) => {
    return {
      i,
      path,
      data: await fetcher([
        next ? `/api/?path=${path}&next=${next}` : `/api?path=${path}`,
        hashedToken ?? undefined,
      ]).catch(error => ({ i, path, error })),
    }
  }

  const pool = [genTask(0, path)]
  const activeTasks = () => pool.filter(Boolean)
  const buf: { [k: string]: TraverseItem[] } = {}

  while (activeTasks().length > 0) {
    let info: { i: number; path: string; data: any }
    try {
      info = await Promise.race(activeTasks())
    } catch (error: any) {
      const { i, path, error: innerError } = error
      if (Math.floor(innerError.status / 100) === 4) {
        delete pool[i]
        yield { path, meta: {}, isFolder: true, error: { status: innerError.status, message: innerError.message.error } }
        continue
      } else {
        throw error
      }
    }

    const { i, path, data } = info
    if (!data || !data.folder) throw new Error('Path is not folder')
    delete pool[i]

    const items = data.folder.value.map((c: any) => ({
      path: getItemPath(path, c.name),
      meta: c,
      isFolder: Boolean(c.folder),
    })) as TraverseItem[]

    if (data.next) {
      buf[path] = (buf[path] ?? []).concat(items)
      const i = pool.length
      pool[i] = genTask(i, path, data.next)
    } else {
      const allItems = (buf[path] ?? []).concat(items)
      if (buf[path]) delete buf[path]

      allItems
        .filter(item => item.isFolder)
        .forEach(item => {
          const i = pool.length
          pool[i] = genTask(i, item.path)
        })
      yield* allItems
    }
  }
}
