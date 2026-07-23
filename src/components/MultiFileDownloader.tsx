import type JSZip from 'jszip'
import type { NextRouter } from 'next/router'
import toast from 'react-hot-toast'
import { getItemPath } from '../utils/drivePath'
import { fetcher } from '../utils/fetchWithSWR'
import { driveListUrl } from '../utils/odUrls'
import { getStoredToken } from '../utils/protectedRouteHandler'

export function DownloadingToast({ router, progress }: { router: NextRouter; progress?: string }) {
  return (
    <div className="flex items-center space-x-2">
      <div className="w-56">
        <span>{progress ? `Downloading ${progress}%` : 'Downloading selected files...'}</span>

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

function downloadBlob({ blob, name }: { blob: Blob; name: string }) {
  const bUrl = window.URL.createObjectURL(blob)
  downloadUrl(bUrl, name)
  window.URL.revokeObjectURL(bUrl)
}

const zipName = (folder?: string) => (folder ? `${folder}.zip` : 'download.zip')
const updateProgress = (toastId: string, router: NextRouter) => (metadata: { percent: number }) => {
  toast.loading(<DownloadingToast router={router} progress={metadata.percent.toFixed(0)} />, { id: toastId })
}
const createZip = async () => new (await import('jszip')).default()

// JSZip types folder() as nullable, since it doubles as a lookup that misses.
// Creating a folder always yields a handle, so surface a real error if it ever does not.
const zipFolder = (zip: JSZip, name: string): JSZip => {
  const dir = zip.folder(name)
  if (!dir) throw new Error(`Could not create folder "${name}" in the generated zip`)
  return dir
}

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
  const dir = folder ? zipFolder(zip, folder) : zip

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
  const root = folder ? zipFolder(zip, folder) : zip
  const map = [{ path: basePath, dir: root }]

  // Add selected file blobs to zip according to its path
  for await (const { name, url, path, isFolder } of files) {
    const parent = map.findLast(({ path: parentPath }) => isDirectChild(parentPath, path))
    if (!parent) throw new Error('File array does not satisfy requirement')

    const dir = parent.dir
    if (isFolder) {
      map.push({ path, dir: zipFolder(dir, name) })
    } else {
      if (!url) throw new Error(`Missing download URL for "${path}"`)
      dir.file(
        name,
        fetch(url).then(r => r.blob()),
      )
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
      data: await fetcher([driveListUrl(path, next), hashedToken ?? undefined]).catch(error => ({ i, path, error })),
    }
  }

  // Keyed by task id so the race set stays proportional to the tasks still in flight, rather
  // than to every task ever started.
  const pool = new Map<number, ReturnType<typeof genTask>>()
  const buf: { [k: string]: TraverseItem[] } = {}
  let nextTaskId = 0

  const addTask = (path: string, next?: string) => {
    const i = nextTaskId++
    pool.set(i, genTask(i, path, next))
  }

  addTask(path)

  while (pool.size > 0) {
    let info: { i: number; path: string; data: any }
    try {
      info = await Promise.race(pool.values())
    } catch (error: any) {
      const { i, path, error: innerError } = error
      if (Math.floor(innerError.status / 100) === 4) {
        pool.delete(i)
        yield {
          path,
          meta: {},
          isFolder: true,
          error: { status: innerError.status, message: innerError.message.error },
        }
        continue
      } else {
        throw error
      }
    }

    const { i, path, data } = info
    if (!data?.folder) throw new Error('Path is not folder')
    pool.delete(i)

    const items = data.folder.value.map((c: any) => ({
      path: getItemPath(path, c.name),
      meta: c,
      isFolder: Boolean(c.folder),
    })) as TraverseItem[]

    if (data.next) {
      buf[path] = (buf[path] ?? []).concat(items)
      addTask(path, data.next)
    } else {
      const allItems = (buf[path] ?? []).concat(items)
      if (buf[path]) delete buf[path]

      for (const item of allItems.filter(item => item.isFolder)) addTask(item.path)
      yield* allItems
    }
  }
}
