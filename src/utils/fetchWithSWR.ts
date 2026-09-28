import useSWRInfinite from 'swr/infinite'

import type { OdAPIResponse } from '../types'

import { driveListUrl } from './odUrls'
import { getStoredToken } from './protectedRouteHandler'

const immutableOptions = {
  // Each folder is cached by key, so an already-visited folder renders instantly on return (no
  // flicker). A never-visited folder has no cached data, so `data` is undefined and FileListing
  // shows its loading state — rather than briefly showing the previous folder's contents, which
  // is why `keepPreviousData` is intentionally NOT set here.
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  revalidateFirstPage: false,
}

// The document head starts the first listing request during HTML parse (see _document.tsx). If
// that in-flight request matches this key, adopt it instead of issuing a second one — collapsing
// the post-hydration fetch out of the critical path. Only the first page of an unprotected path
// qualifies; a mismatch or a failed prefetch falls through to a normal request below.
function consumeListPrefetch(url: string, token?: string): Promise<any> | null {
  if (typeof window === 'undefined' || token) return null
  const pf = (window as any).__MURAKUMO_LIST_PREFETCH__
  if (!pf || pf.used || /[?&]next=/.test(url)) return null
  const reqPath = url.match(/[?&]path=([^&]*)/)?.[1] ?? '/'
  if (reqPath !== pf.path) return null
  pf.used = true
  return pf.promise as Promise<any>
}

export async function fetcher([url, token]: [url: string, token?: string]): Promise<any> {
  const prefetched = consumeListPrefetch(url, token)
  if (prefetched) {
    try {
      return await prefetched
    } catch {
      // Prefetch failed (e.g. the site isn't set up yet) — fall through to a normal request so the
      // real status/error still reaches SWR (401 -> auth prompt, 403 -> OAuth redirect, etc.).
    }
  }

  try {
    const headers = token ? { 'od-protected-token': token } : undefined
    const response = await fetch(url, { headers })
    if (!response.ok) {
      const message = await response.text()
      throw { status: response.status, message }
    }
    return await response.json()
  } catch (err: any) {
    if (typeof err?.status === 'number') throw err
    throw { status: 0, message: err?.message ?? String(err) }
  }
}

export function useProtectedSWRInfinite(path: string = '') {
  const hashedToken = getStoredToken(path)

  function getNextKey(pageIndex: number, previousPageData: OdAPIResponse): (string | null)[] | null {
    if (previousPageData && !previousPageData.folder) return null
    return [driveListUrl(path, pageIndex === 0 ? undefined : previousPageData.next), hashedToken]
  }

  const { data, error, size, setSize } = useSWRInfinite(getNextKey, fetcher, immutableOptions)
  return { data, error, size, setSize, hashedToken }
}
