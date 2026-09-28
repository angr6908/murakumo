import apiConfig from './apiConfig'
import { normalizePath } from './drivePath'
import { get, isHttpError, type QueryParams } from './http'
import { exchangeToken } from './oAuthHandler'
import { getOdAuthTokens, storeOdAuthTokens } from './odAuthTokenStore'
import { compareHashedToken } from './protectedRouteHandler'
import siteConfig from './siteConfig'

export const basePath = normalizePath(siteConfig.baseDirectory).replace(/\/$/, '')
let refreshAccessTokenPromise: Promise<string> | null = null

export function encodePath(path: string): string {
  const fullPath = normalizePath(`${basePath}/${path}`)
  return fullPath === '/' ? '' : `:${encodeURIComponent(fullPath)}`
}

/**
 * Build a Graph drive item URL. Graph requires the addressing colon to be closed before any
 * sub-resource (`/children`, `/thumbnails`, `/search(...)`), except at the drive root.
 */
export function driveItemUrl(path: string, sub = ''): string {
  const encodedPath = encodePath(path)
  const separator = sub && encodedPath !== '' ? ':' : ''
  return `${apiConfig.driveApi}/root${encodedPath}${separator}${sub}`
}

export async function graphGet(url: string, accessToken: string, params?: QueryParams) {
  const { data } = await get(url, { headers: { Authorization: `Bearer ${accessToken}` }, params })
  return data
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
    console.error(
      '[onedriveApi] Failed to refresh access token.',
      isHttpError(error) ? { status: error.response.status, message: error.response.data } : error,
    )
    return ''
  }
}

const protectedRoutes = siteConfig.protectedRoutes
  .filter((route): route is string => typeof route === 'string')
  .map(route => `${route.toLowerCase().replace(/\/$/, '')}/`)

function getAuthTokenPath(path: string) {
  const cleanPath = `${path.toLowerCase()}/`
  const route = protectedRoutes.find(route => cleanPath.startsWith(route))
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
    const token = await graphGet(driveItemUrl(authTokenPath), accessToken, {
      select: '@microsoft.graph.downloadUrl,file',
    })
    const { data: password } = await get(token['@microsoft.graph.downloadUrl'])

    if (!compareHashedToken({ odTokenHeader, dotPassword: password.toString() })) {
      return { code: 401, message: 'Password required.' }
    }
  } catch (error: unknown) {
    return isHttpError(error) && error.response.status === 404
      ? { code: 404, message: "You didn't set a password." }
      : { code: 500, message: 'Internal server error.' }
  }

  return { code: 200, message: 'Authenticated.' }
}
