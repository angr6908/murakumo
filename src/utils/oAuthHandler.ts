import AES from 'crypto-js/aes'
import encUtf8 from 'crypto-js/enc-utf8'

import apiConfig from './apiConfig'
import { isHttpError, post } from './http'

const AES_SECRET_KEY = 'onedrive-vercel-index'

const obfuscateToken = (token: string) => AES.encrypt(token, AES_SECRET_KEY).toString()
export const revealObfuscatedToken = (obfuscated: string) => AES.decrypt(obfuscated, AES_SECRET_KEY).toString(encUtf8)

function getClientSecret(): string {
  return apiConfig.clientSecret || revealObfuscatedToken(apiConfig.obfuscatedClientSecret)
}

export function generateAuthorisationUrl({
  clientId,
  redirectUri,
  authApi,
  scope,
}: {
  clientId: string
  redirectUri: string
  authApi: string
  scope: string
}): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    response_mode: 'query',
  })
  return `${authApi.replace('/token', '/authorize')}?${params.toString()}`
}

export function extractAuthCodeFromRedirected(url: string, redirectUri: string): string {
  if (!url.startsWith(redirectUri)) return ''
  return new URLSearchParams(url.split('?')[1]).get('code') ?? ''
}

/**
 * POST the auth endpoint with a body of grant-specific fields plus the shared client credentials,
 * returning the raw response body. Both the authorization-code flow (OAuth pages) and the
 * refresh-token flow (server-side token refresh) share this single exchange.
 */
export function exchangeToken(extraParams: Record<string, string>) {
  const { clientId, redirectUri, authApi } = apiConfig
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    client_secret: getClientSecret(),
    ...extraParams,
  })

  return post(authApi, params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
}

export async function requestTokenWithAuthCode(
  code: string,
): Promise<
  | { expiryTime: number; accessToken: string; refreshToken: string }
  | { error: string; errorDescription: string; errorUri: string }
> {
  try {
    const { data } = await exchangeToken({ code, grant_type: 'authorization_code' })
    return { expiryTime: data.expires_in, accessToken: data.access_token, refreshToken: data.refresh_token }
  } catch (err: unknown) {
    if (!isHttpError(err) || !err.response.data || typeof err.response.data !== 'object') {
      return { error: 'unknown_error', errorDescription: 'Unexpected error during token request.', errorUri: '' }
    }
    const { error, error_description, error_uri } = err.response.data as {
      error?: string
      error_description?: string
      error_uri?: string
    }
    return {
      error: error ?? 'unknown_error',
      errorDescription: error_description ?? 'Unexpected error during token request.',
      errorUri: error_uri ?? '',
    }
  }
}

export async function sendTokenToServer(accessToken: string, refreshToken: string, expiryTime: number) {
  return post('/api', {
    obfuscatedAccessToken: obfuscateToken(accessToken),
    accessTokenExpiry: expiryTime,
    obfuscatedRefreshToken: obfuscateToken(refreshToken),
  })
}
