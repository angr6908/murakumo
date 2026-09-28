/** Query-string mapping as parsed by the router (replaces `node:querystring`'s `ParsedUrlQuery`). */
export type QueryMap = Record<string, string | string[] | undefined>

/** Encode drive path segments the way every link and API call in the app expects. */
export const encodeSegments = (segments: string[]) => segments.map(encodeURIComponent).join('/')

export function queryToPath(query?: QueryMap): string {
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

/**
 * OneDrive caps the visible folder "Personal Vault" at the drive root; it can't be opened from
 * the browser, so the listing filters it out. Normalising (NFKC + trim + lower) matches how
 * Graph actually presents the name.
 */
export const isNotPersonalVaultItem = (item: { name?: unknown }) =>
  (typeof item.name === 'string' ? item.name.normalize('NFKC').trim().toLowerCase() : '') !== 'personal vault'

export function normalizePath(path: string): string {
  const segments: string[] = []
  for (const segment of path.split('/')) {
    if (segment === '..') segments.pop()
    else if (segment && segment !== '.') segments.push(segment)
  }
  return `/${segments.join('/')}`
}
