import { getEnv } from './env'

const oauthPublicConfig = {
  clientId: getEnv('CLIENT_ID'),
  obfuscatedClientSecret: getEnv('OBFUSCATED_CLIENT_SECRET'),
  redirectUri: getEnv('REDIRECT_URI', 'http://localhost:3000'),
  authApi: getEnv('AUTH_API', 'https://login.microsoftonline.com/common/oauth2/v2.0/token'),
  driveApi: getEnv('DRIVE_API', 'https://graph.microsoft.com/v1.0/me/drive'),
  scope: getEnv('SCOPE', 'user.read files.read.all offline_access'),
}

/** The subset of the API config the OAuth setup pages render and build their authorisation URL from. */
export type OAuthPublicConfig = typeof oauthPublicConfig

export const getOAuthPublicConfig = (): OAuthPublicConfig => oauthPublicConfig

const apiConfig = {
  ...oauthPublicConfig,
  clientSecret: getEnv('CLIENT_SECRET'),
  cacheControlHeader: getEnv('CACHE_CONTROL_HEADER', 'max-age=0, s-maxage=60, stale-while-revalidate'),
}

export default apiConfig
