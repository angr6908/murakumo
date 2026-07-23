import type { ParsedUrlQuery } from 'node:querystring'

/** Encode drive path segments the way every link and API call in the app expects. */
export const encodeSegments = (segments: string[]) => segments.map(encodeURIComponent).join('/')

export function queryToPath(query?: ParsedUrlQuery): string {
  if (!query?.path) return '/'
  const { path } = query
  return `/${encodeSegments(typeof path === 'string' ? [path] : path)}`
}

export function getItemPath(path: string, name: string): string {
  return `${path === '/' ? '' : path}/${encodeURIComponent(name)}`
}

/** Last segment of a drive path, e.g. `/a/b/c.txt` -> `c.txt`. */
export const basename = (path: string) => path.slice(path.lastIndexOf('/') + 1)

/** Everything before the last segment, e.g. `/a/b/c.txt` -> `/a/b`. */
export const dirname = (path: string) => path.slice(0, path.lastIndexOf('/'))

type DriveItemName = { name?: unknown }
const normaliseName = (name: unknown) => (typeof name === 'string' ? name.normalize('NFKC').trim().toLowerCase() : '')
const isPersonalVaultItem = (item: DriveItemName) => normaliseName(item.name) === 'personal vault'
export const isNotPersonalVaultItem = <T extends DriveItemName>(item: T) => !isPersonalVaultItem(item)
