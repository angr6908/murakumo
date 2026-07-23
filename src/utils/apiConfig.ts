import { getEnv } from './env'

export type ApiConfig = {
  clientId: string
  clientSecret: string
  obfuscatedClientSecret: string
  redirectUri: string
  authApi: string
  driveApi: string
  scope: string
  cacheControlHeader: string
}

const apiConfig: ApiConfig = {
  clientId: getEnv('CLIENT_ID'),
  clientSecret: getEnv('CLIENT_SECRET'),
  obfuscatedClientSecret: getEnv('OBFUSCATED_CLIENT_SECRET'),
  redirectUri: getEnv('REDIRECT_URI', 'http://localhost:3000'),
  authApi: getEnv('AUTH_API', 'https://login.microsoftonline.com/common/oauth2/v2.0/token'),
  driveApi: getEnv('DRIVE_API', 'https://graph.microsoft.com/v1.0/me/drive'),
  scope: getEnv('SCOPE', 'user.read files.read.all offline_access'),
  cacheControlHeader: getEnv('CACHE_CONTROL_HEADER', 'max-age=0, s-maxage=60, stale-while-revalidate'),
}

/** The subset of the API config the OAuth setup pages render and build their authorisation URL from. */
export type OAuthPublicConfig = Pick<
  ApiConfig,
  'clientId' | 'obfuscatedClientSecret' | 'redirectUri' | 'authApi' | 'driveApi' | 'scope'
>

export const getOAuthPublicConfig = (): OAuthPublicConfig => ({
  clientId: apiConfig.clientId,
  obfuscatedClientSecret: apiConfig.obfuscatedClientSecret,
  redirectUri: apiConfig.redirectUri,
  authApi: apiConfig.authApi,
  driveApi: apiConfig.driveApi,
  scope: apiConfig.scope,
})

export default apiConfig
