import axios from 'axios'
import useSWRInfinite from 'swr/infinite'

import type { OdAPIResponse } from '../types'

import { getStoredToken } from './protectedRouteHandler'

const immutableOptions = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
}

export async function fetcher([url, token]: [url: string, token?: string]): Promise<any> {
  try {
    const config = token ? { headers: { 'od-protected-token': token } } : undefined
    const { data } = await axios.get(url, config)
    return data
  } catch (err: any) {
    throw { status: err.response.status, message: err.response.data }
  }
}

export function useProtectedSWRInfinite(path: string = '') {
  const hashedToken = getStoredToken(path)

  function getNextKey(pageIndex: number, previousPageData: OdAPIResponse): (string | null)[] | null {
    if (previousPageData && !previousPageData.folder) return null
    if (pageIndex === 0) return [`/api/?path=${path}`, hashedToken]
    return [`/api/?path=${path}&next=${previousPageData.next}`, hashedToken]
  }

  return useSWRInfinite(getNextKey, fetcher, immutableOptions)
}
