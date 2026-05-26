import type { OdFileObject } from '../types'

type ThumbnailSize = 'large' | 'medium' | 'small'

export function appendProtectedToken(url: string, token?: string | null): string {
  return token ? `${url}${url.includes('?') ? '&' : '?'}odpt=${token}` : url
}

export function rawFileUrl(path: string, token?: string | null, baseUrl = '', proxy = false): string {
  return appendProtectedToken(`${baseUrl}/api/raw/?path=${path}${proxy ? '&proxy=true' : ''}`, token)
}

export function thumbnailUrl(path: string, size: ThumbnailSize, token?: string | null): string {
  return appendProtectedToken(`/api/thumbnail/?path=${path}&size=${size}`, token)
}

export function namedRawFileUrl(name: string, path: string, token?: string | null, baseUrl = ''): string {
  return appendProtectedToken(`${baseUrl}/api/name/${name}?path=${path}`, token)
}

export function directFileUrl(file: OdFileObject, fallbackPath: string, token?: string | null, baseUrl = ''): string {
  return file['@microsoft.graph.downloadUrl'] ?? rawFileUrl(fallbackPath, token, baseUrl)
}
