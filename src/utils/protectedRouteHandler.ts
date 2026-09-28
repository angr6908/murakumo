import sha256 from 'crypto-js/sha256'
import { encodeSegments } from './drivePath'
import { getPublicRuntimeConfig } from './publicRuntimeConfig'

const encryptToken = (token: string) => sha256(token).toString()

// `route` is the raw configured value (also the localStorage key); `prefix` is its encoded form.
let encodedRoutes: Array<{ route: string; prefix: string }> | undefined

export function matchProtectedRoute(path: string): string {
  encodedRoutes ??= getPublicRuntimeConfig()
    .protectedRoutes.filter(Boolean)
    .map(route => ({ route, prefix: encodeSegments(route.split('/')) }))
  return encodedRoutes.find(({ prefix }) => path.startsWith(prefix))?.route ?? ''
}

const hashedTokens = new Map<string, string | null>()

function hashStoredToken(route: string): string | null {
  try {
    const token = JSON.parse(localStorage.getItem(route) ?? 'null')
    return token ? encryptToken(token) : null
  } catch {
    return null
  }
}

export function getStoredToken(path: string): string | null {
  if (typeof window === 'undefined') return null
  const route = matchProtectedRoute(path)
  if (!hashedTokens.has(route)) hashedTokens.set(route, hashStoredToken(route))
  return hashedTokens.get(route) ?? null
}

export function compareHashedToken({
  odTokenHeader,
  dotPassword,
}: {
  odTokenHeader: string
  dotPassword: string
}): boolean {
  return encryptToken(dotPassword.trim()) === odTokenHeader
}
