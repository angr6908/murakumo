import sha256 from 'crypto-js/sha256'
import { encodeSegments } from './drivePath'
import { getPublicRuntimeConfig } from './publicRuntimeConfig'

const encryptToken = (token: string) => sha256(token).toString()

// The encoded form of each protected route is derived from build-time config, so it is
// computed once per config object rather than on every lookup (one lookup per rendered item).
// `route` is the raw configured value (also the localStorage key); `prefix` is its encoded form.
let encodedRoutesCache: { source: string[]; routes: Array<{ route: string; prefix: string }> } | null = null

function encodedProtectedRoutes() {
  const protectedRoutes = getPublicRuntimeConfig().protectedRoutes
  if (encodedRoutesCache?.source !== protectedRoutes) {
    encodedRoutesCache = {
      source: protectedRoutes,
      routes: protectedRoutes.filter(Boolean).map(route => ({ route, prefix: encodeSegments(route.split('/')) })),
    }
  }
  return encodedRoutesCache.routes
}

export function getStoredToken(path: string): string | null {
  const storedToken =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(matchProtectedRoute(path)) as string) : ''
  return storedToken ? encryptToken(storedToken) : null
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

export function matchProtectedRoute(route: string): string {
  return encodedProtectedRoutes().find(({ prefix }) => route.startsWith(prefix))?.route ?? ''
}
