import type JSZip from 'jszip'
import type { NextRouter } from 'next/router'
import toast from 'react-hot-toast'
import { useI18n } from '../i18n'
import { dirname, getItemPath } from '../utils/drivePath'
import { fetcher } from '../utils/fetchWithSWR'
import { driveListUrl } from '../utils/odUrls'
import { getStoredToken } from '../utils/protectedRouteHandler'

export function DownloadingToast({ router, progress }: { router: NextRouter; progress?: string }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-3">
      <div className="flex w-52 flex-col gap-2">
        <span className="tabular-nums">{progress ? t('Downloading {{progress}}%', { progress }) : t('Downloading selected files...')}</span>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            style={{ width: `${progress ?? 0}%` }}
            className="h-full rounded-full bg-primary transition-[width] duration-(--duration-fast)"
          />
        </div>
      </div>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => router.reload()}>
        {t('Cancel')}
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

// JSZip types folder() as nullable, since it doubles as a lookup that misses.
// Creating a folder always yields a handle, so surface a real error if it ever does not.
const zipFolder = (zip: JSZip, name: string): JSZip => {
  const dir = zip.folder(name)
  if (!dir) throw new Error(`Could not create folder "${name}" in the generated zip`)
  return dir
}

async function createZip(folder?: string) {
  const zip = new (await import('jszip')).default()
  return { zip, root: folder ? zipFolder(zip, folder) : zip }
}

const addFile = (dir: JSZip, name: string, url: string) => dir.file(name, fetch(url).then(r => r.blob()))

async function saveZip(zip: JSZip, { toastId, router, folder }: { toastId: string; router: NextRouter; folder?: string }) {
  let shown = ''
  const blob = await zip.generateAsync({ type: 'blob' }, ({ percent }) => {
    const progress = percent.toFixed(0)
    if (progress === shown) return
    shown = progress
    toast.loading(<DownloadingToast router={router} progress={progress} />, { id: toastId })
  })
  const url = URL.createObjectURL(blob)
  downloadUrl(url, folder ? `${folder}.zip` : 'download.zip')
  URL.revokeObjectURL(url)
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
  const { zip, root } = await createZip(folder)
  for (const { name, url } of files) addFile(root, name, url)
  await saveZip(zip, { toastId, router, folder })
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
  const { zip, root } = await createZip(folder)
  const dirs = new Map([[basePath, root]])

  for await (const { name, url, path, isFolder } of files) {
    const dir = dirs.get(dirname(path))
    if (!dir) throw new Error('File array does not satisfy requirement')
    if (isFolder) dirs.set(path, zipFolder(dir, name))
    else if (url) addFile(dir, name, url)
    else throw new Error(`Missing download URL for "${path}"`)
  }

  await saveZip(zip, { toastId, router, folder })
}

interface TraverseItem {
  path: string
  name: string
  isFolder: boolean
  error?: { status: number; message: string }
}

type TaskResult = { id: number; path: string; data?: any; error?: any }

export async function* traverseFolder(path: string): AsyncGenerator<TraverseItem, void, undefined> {
  const hashedToken = getStoredToken(path) ?? undefined
  const pool = new Map<number, Promise<TaskResult>>()
  const pending = new Map<string, TraverseItem[]>()
  let nextTaskId = 0

  const addTask = (path: string, next?: string) => {
    const id = nextTaskId++
    pool.set(
      id,
      fetcher([driveListUrl(path, next), hashedToken]).then(
        data => ({ id, path, data }),
        error => ({ id, path, error }),
      ),
    )
  }

  addTask(path)

  while (pool.size > 0) {
    const { id, path, data, error } = await Promise.race(pool.values())
    pool.delete(id)

    if (error) {
      if (Math.floor(error.status / 100) !== 4) throw error
      yield { path, name: '', isFolder: true, error: { status: error.status, message: error.message } }
      continue
    }
    if (!data?.folder) throw new Error('Path is not folder')

    const items = pending.get(path) ?? []
    for (const c of data.folder.value) items.push({ path: getItemPath(path, c.name), name: c.name, isFolder: Boolean(c.folder) })

    if (data.next) {
      pending.set(path, items)
      addTask(path, data.next)
    } else {
      pending.delete(path)
      for (const item of items) if (item.isFolder) addTask(item.path)
      yield* items
    }
  }
}
