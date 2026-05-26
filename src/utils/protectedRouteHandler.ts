import sha256 from 'crypto-js/sha256'
import { getPublicRuntimeConfig } from './publicRuntimeConfig'

const encryptToken = (token: string) => sha256(token).toString()

export function getStoredToken(path: string): string | null {
  const storedToken =
    typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(matchProtectedRoute(path)) as string) : ''
  return storedToken ? encryptToken(storedToken) : null
}

export function compareHashedToken({ odTokenHeader, dotPassword }: { odTokenHeader: string; dotPassword: string }): boolean {
  return encryptToken(dotPassword.trim()) === odTokenHeader
}

export function matchProtectedRoute(route: string): string {
  const protectedRoutes = getPublicRuntimeConfig().protectedRoutes
  return protectedRoutes.find(r => r && route.startsWith(r.split('/').map(encodeURIComponent).join('/'))) ?? ''
}
