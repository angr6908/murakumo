import { get, put } from '@vercel/blob'
import { getEnv } from './env'

type StoredTokens = {
  accessToken?: string
  accessTokenExpiresAt?: number
  refreshToken?: string
}

const tokenBlobPath = getEnv('AUTH_TOKEN_BLOB_PATH', 'onedrive-auth-tokens.json')
const storeId = getEnv('BLOB_STORE_ID')
const oidcToken = getEnv('VERCEL_OIDC_TOKEN')
const blobAuthOptions = storeId && oidcToken ? { storeId, oidcToken } : {}

function parseStoredTokens(content: string, source: string): StoredTokens {
  try {
    return JSON.parse(content) as StoredTokens
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      console.error(`[odAuthTokenStore] Ignoring invalid token store JSON at ${source}.`)
      return {}
    }
    throw error
  }
}

const hasFreshAccessToken = (tokens: StoredTokens): tokens is StoredTokens & { accessToken: string } =>
  typeof tokens.accessToken === 'string' &&
  typeof tokens.accessTokenExpiresAt === 'number' &&
  tokens.accessTokenExpiresAt > Date.now()

// Every API request needs the access token, so without this each one would cost a Blob origin
// read. The token stays valid until its stored expiry, so it is safe to reuse until then; once
// expired (or absent) we always go back to the store, which is also how an instance picks up a
// token refreshed elsewhere.
let cachedTokens: StoredTokens | null = null
let inFlightRead: Promise<StoredTokens> | null = null

async function fetchTokens(): Promise<StoredTokens> {
  const blob = await get(tokenBlobPath, { ...blobAuthOptions, access: 'private', useCache: false })
  const tokens =
    !blob || blob.statusCode === 304 || !blob.stream
      ? {}
      : parseStoredTokens(await new Response(blob.stream).text(), `Vercel Blob ${tokenBlobPath}`)

  cachedTokens = tokens
  return tokens
}

function readTokens(): Promise<StoredTokens> {
  if (cachedTokens && hasFreshAccessToken(cachedTokens)) return Promise.resolve(cachedTokens)

  inFlightRead ??= fetchTokens().finally(() => {
    inFlightRead = null
  })
  return inFlightRead
}

async function writeTokens(tokens: StoredTokens): Promise<void> {
  await put(tokenBlobPath, JSON.stringify(tokens, null, 2), {
    ...blobAuthOptions,
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  })
  cachedTokens = tokens
}

export async function getOdAuthTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const tokens = await readTokens()
  return {
    accessToken: hasFreshAccessToken(tokens) ? tokens.accessToken : null,
    refreshToken: tokens.refreshToken ?? null,
  }
}

export async function storeOdAuthTokens({
  accessToken,
  accessTokenExpiry,
  refreshToken,
}: {
  accessToken: string
  accessTokenExpiry: number
  refreshToken: string
}): Promise<void> {
  await writeTokens({
    accessToken,
    accessTokenExpiresAt: Date.now() + Math.max(accessTokenExpiry - 60, 1) * 1000,
    refreshToken,
  })
}
