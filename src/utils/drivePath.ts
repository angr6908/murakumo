import type { ParsedUrlQuery } from 'querystring'

export function queryToPath(query?: ParsedUrlQuery): string {
  if (!query?.path) return '/'
  const { path } = query
  return typeof path === 'string' ? `/${encodeURIComponent(path)}` : `/${path.map(encodeURIComponent).join('/')}`
}

export function getItemPath(path: string, name: string): string {
  return `${path === '/' ? '' : path}/${encodeURIComponent(name)}`
}

type DriveItemName = { name?: unknown }
const normaliseName = (name: unknown) =>
  typeof name === 'string' ? name.normalize('NFKC').trim().toLowerCase() : ''
export const isPersonalVaultItem = (item: DriveItemName) => normaliseName(item.name) === 'personal vault'
export const isNotPersonalVaultItem = <T extends DriveItemName>(item: T) => !isPersonalVaultItem(item)
