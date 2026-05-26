import { get, put } from '@vercel/blob'

type StoredTokens = {
  accessToken?: string
  accessTokenExpiresAt?: number
  refreshToken?: string
}

const tokenBlobPath = process.env.AUTH_TOKEN_BLOB_PATH || 'onedrive-auth-tokens.json'

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

async function readTokens(): Promise<StoredTokens> {
  const blob = await get(tokenBlobPath, { access: 'private', useCache: false })
  if (!blob || blob.statusCode === 304 || !blob.stream) return {}

  const content = await new Response(blob.stream).text()
  return parseStoredTokens(content, `Vercel Blob ${tokenBlobPath}`)
}

async function writeTokens(tokens: StoredTokens): Promise<void> {
  await put(tokenBlobPath, JSON.stringify(tokens, null, 2), {
    access: 'private',
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  })
}

export async function getOdAuthTokens(): Promise<{ accessToken: unknown; refreshToken: unknown }> {
  const tokens = await readTokens()
  const accessToken =
    typeof tokens.accessToken === 'string' &&
    typeof tokens.accessTokenExpiresAt === 'number' &&
    tokens.accessTokenExpiresAt > Date.now()
      ? tokens.accessToken
      : null
  return { accessToken, refreshToken: tokens.refreshToken ?? null }
}

export async function storeOdAuthTokens({ accessToken, accessTokenExpiry, refreshToken }: {
  accessToken: string; accessTokenExpiry: number; refreshToken: string
}): Promise<void> {
  await writeTokens({
    accessToken,
    accessTokenExpiresAt: Date.now() + Math.max(accessTokenExpiry - 60, 1) * 1000,
    refreshToken,
  })
}
