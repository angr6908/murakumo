import { posix as pathPosix } from 'path'

import type { NextApiResponse } from 'next'

import { checkAuthRoute, getAccessToken } from './onedriveApi'

export const graphHeaders = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` })

export async function requireAccessToken(res: NextApiResponse): Promise<string | null> {
  const accessToken = await getAccessToken()
  if (accessToken) return accessToken

  res.status(403).json({ error: 'No access token.' })
  return null
}

export function normalisePathQuery(
  value: string | string[] | undefined,
  { trimTrailingSlash = false }: { trimTrailingSlash?: boolean } = {},
): { path: string; error?: never } | { path?: never; error: string } {
  const path = value ?? '/'

  if (path === '[...path]') {
    return { error: 'No path specified.' }
  }
  if (typeof path !== 'string') {
    return { error: 'Path query invalid.' }
  }

  const cleanPath = pathPosix.resolve('/', pathPosix.normalize(path))
  return { path: trimTrailingSlash ? cleanPath.replace(/\/$/, '') : cleanPath }
}

export async function verifyProtectedPath(
  res: NextApiResponse,
  cleanPath: string,
  accessToken: string,
  protectedToken = '',
) {
  const { code, message } = await checkAuthRoute(cleanPath, accessToken, protectedToken)

  if (code !== 200) {
    res.status(code).json({ error: message })
    return false
  }

  if (message) {
    res.setHeader('Cache-Control', 'no-cache')
  }
  return true
}

export function sendDriveError(res: NextApiResponse, error: any) {
  res.status(error?.response?.status ?? 500).json({ error: error?.response?.data ?? 'Internal server error.' })
}

export function nextPageToken(nextLink?: string): string | null {
  return nextLink?.match(/&\$skiptoken=(.+)/i)?.[1] ?? null
}
