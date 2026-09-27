import type { NextApiRequest, NextApiResponse } from 'next'

import apiConfig from './apiConfig'
import { get, isHttpError } from './http'
import { exchangeToken } from './oAuthHandler'
import { getOdAuthTokens, storeOdAuthTokens } from './odAuthTokenStore'
import { join, resolve } from './posix'
import { compareHashedToken } from './protectedRouteHandler'
import siteConfig from './siteConfig'

const basePath = resolve('/', siteConfig.baseDirectory)
let refreshAccessTokenPromise: Promise<string> | null = null

export function encodePath(path: string): string {
  const encodedPath = join(basePath, path).replace(/\/$/, '')
  return encodedPath === '/' || encodedPath === '' ? '' : `:${encodeURIComponent(encodedPath)}`
}

export const graphHeaders = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` })

/**
 * Build a Graph drive item URL. Graph requires the addressing colon to be closed before any
 * sub-resource (`/children`, `/thumbnails`, `/search(...)`), except at the drive root.
 */
export function driveItemUrl(path: string, sub = ''): string {
  const encodedPath = encodePath(path)
  const separator = sub && encodedPath !== '' ? ':' : ''
  return `${apiConfig.driveApi}/root${encodedPath}${separator}${sub}`
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const resp = await exchangeToken({ refresh_token: refreshToken, grant_type: 'refresh_token' })

  if ('access_token' in resp.data && 'refresh_token' in resp.data) {
    const { expires_in, access_token, refresh_token } = resp.data
    await storeOdAuthTokens({
      accessToken: access_token,
      accessTokenExpiry: parseInt(expires_in, 10),
      refreshToken: refresh_token,
    })
    console.log('Fetch new access token with stored refresh token.')
    return access_token
  }

  return ''
}

export async function getAccessToken(): Promise<string> {
  const { accessToken, refreshToken } = await getOdAuthTokens().catch(error => {
    console.error('[onedriveApi] Failed to read auth tokens.', error)
    return { accessToken: null, refreshToken: null }
  })

  if (accessToken) {
    console.log('Fetch access token from storage.')
    return accessToken
  }

  if (!refreshToken) {
    console.log('No refresh token, return empty access token.')
    return ''
  }

  refreshAccessTokenPromise ??= refreshAccessToken(refreshToken).finally(() => {
    refreshAccessTokenPromise = null
  })

  try {
    return await refreshAccessTokenPromise
  } catch (error) {
    if (isHttpError(error)) {
      console.error('[onedriveApi] Failed to refresh access token.', {
        status: error.response?.status,
        message: error.response?.data,
      })
    } else {
      console.error('[onedriveApi] Failed to refresh access token.', error)
    }
    return ''
  }
}

function getAuthTokenPath(path: string) {
  const cleanPath = `${path.toLowerCase()}/`
  const route = siteConfig.protectedRoutes
    .filter((r): r is string => typeof r === 'string')
    .map(r => `${r.toLowerCase().replace(/\/$/, '')}/`)
    .find(r => cleanPath.startsWith(r))
  return route ? `${route}.password` : ''
}

export const isProtectedPath = (path: string) => getAuthTokenPath(path) !== ''

export async function checkAuthRoute(
  cleanPath: string,
  accessToken: string,
  odTokenHeader: string,
): Promise<{ code: 200 | 401 | 404 | 500; message: string }> {
  const authTokenPath = getAuthTokenPath(cleanPath)

  if (authTokenPath === '') {
    return { code: 200, message: '' }
  }

  try {
    const token = await get(driveItemUrl(authTokenPath), {
      headers: graphHeaders(accessToken),
      params: {
        select: '@microsoft.graph.downloadUrl,file',
      },
    })
    const odProtectedToken = await get(token.data['@microsoft.graph.downloadUrl'])

    if (
      !compareHashedToken({
        odTokenHeader,
        dotPassword: odProtectedToken.data.toString(),
      })
    ) {
      return { code: 401, message: 'Password required.' }
    }
  } catch (error: unknown) {
    return isHttpError(error) && error.response.status === 404
      ? { code: 404, message: "You didn't set a password." }
      : { code: 500, message: 'Internal server error.' }
  }

  return { code: 200, message: 'Authenticated.' }
}

/**
 * Native CORS headers for the transparent API proxy routes (replaces the `cors`
 * package). Handles preflight (`OPTIONS`) and mirrors the request origin.
 */
const CORS_METHODS = 'GET,HEAD,PUT,PATCH,POST,DELETE'

export function runCorsMiddleware(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] ?? '*')
  res.setHeader('Access-Control-Allow-Methods', CORS_METHODS)
  res.setHeader('Access-Control-Max-Age', '1728000')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
  }
}
