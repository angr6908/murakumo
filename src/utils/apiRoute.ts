import type { NextApiRequest, NextApiResponse } from 'next'

import apiConfig from './apiConfig'
import { normalizePath } from './drivePath'
import { checkAuthRoute, getAccessToken } from './onedriveApi'

/** The shared cache policy for API responses that aren't protected or freshly fetched. */
export function setDefaultCacheControl(res: NextApiResponse) {
  if (!res.getHeader('Cache-Control')) res.setHeader('Cache-Control', apiConfig.cacheControlHeader)
}

export async function requireAccessToken(res: NextApiResponse): Promise<string | null> {
  const accessToken = await getAccessToken()
  if (accessToken) return accessToken

  res.status(403).json({ error: 'No access token.' })
  return null
}

export async function authorizePath(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<{ path: string; accessToken: string } | null> {
  const { path = '/', odpt } = req.query
  if (typeof path !== 'string') {
    res.status(400).json({ error: 'Path query invalid.' })
    return null
  }

  const accessToken = await requireAccessToken(res)
  if (!accessToken) return null

  const cleanPath = normalizePath(path)
  const protectedToken = req.headers['od-protected-token'] ?? odpt
  const { code, message } = await checkAuthRoute(
    cleanPath,
    accessToken,
    typeof protectedToken === 'string' ? protectedToken : '',
  )
  if (code !== 200) {
    res.status(code).json({ error: message })
    return null
  }

  res.setHeader('Cache-Control', message ? 'no-cache' : apiConfig.cacheControlHeader)
  return { path: cleanPath, accessToken }
}

export function sendDriveError(res: NextApiResponse, error: any) {
  res.status(error?.response?.status ?? 500).json({ error: error?.response?.data ?? 'Internal server error.' })
}

/**
 * Native CORS headers for the transparent API proxy routes (replaces the `cors`
 * package). Handles preflight (`OPTIONS`) and mirrors the request origin.
 */
export function handleCors(req: NextApiRequest, res: NextApiResponse): boolean {
  const origin = req.headers.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] ?? '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
  res.setHeader('Access-Control-Max-Age', '1728000')

  if (req.method !== 'OPTIONS') return false
  res.status(204).end()
  return true
}
