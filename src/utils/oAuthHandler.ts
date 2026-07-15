import axios from 'axios'
import CryptoJS from 'crypto-js'

import apiConfig from './apiConfig'

const AES_SECRET_KEY = 'onedrive-vercel-index'

export const obfuscateToken = (token: string) => CryptoJS.AES.encrypt(token, AES_SECRET_KEY).toString()
export const revealObfuscatedToken = (obfuscated: string) =>
  CryptoJS.AES.decrypt(obfuscated, AES_SECRET_KEY).toString(CryptoJS.enc.Utf8)

export function getClientSecret(): string {
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

export async function requestTokenWithAuthCode(
  code: string,
): Promise<
  | { expiryTime: string; accessToken: string; refreshToken: string }
  | { error: string; errorDescription: string; errorUri: string }
> {
  const { clientId, redirectUri, authApi } = apiConfig
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    client_secret: getClientSecret(),
    code,
    grant_type: 'authorization_code',
  })

  try {
    const { data } = await axios.post(authApi, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return { expiryTime: data.expires_in, accessToken: data.access_token, refreshToken: data.refresh_token }
  } catch (err: any) {
    const { error, error_description, error_uri } = err.response.data
    return { error, errorDescription: error_description, errorUri: error_uri }
  }
}

export async function sendTokenToServer(accessToken: string, refreshToken: string, expiryTime: string | number) {
  return axios.post(
    '/api',
    {
      obfuscatedAccessToken: obfuscateToken(accessToken),
      accessTokenExpiry: Number(expiryTime),
      obfuscatedRefreshToken: obfuscateToken(refreshToken),
    },
    { headers: { 'Content-Type': 'application/json' } },
  )
}
