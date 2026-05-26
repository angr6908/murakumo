import { useEffect, useState } from 'react'
import { appendProtectedToken } from './odUrls'
import { getStoredToken } from './protectedRouteHandler'

export default function useFileContent(
  fetchUrl: string,
  path: string,
): { response: any; error: string; validating: boolean } {
  const [response, setResponse] = useState('')
  const [validating, setValidating] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    const url = appendProtectedToken(fetchUrl, getStoredToken(path))

    setValidating(true)
    setError('')

    fetch(url, { headers: { Accept: 'text/plain, */*' }, signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(response.statusText || `Request failed with ${response.status}`)
        return response.text()
      })
      .then(text => { if (active) setResponse(text) })
      .catch(error => { if (active && error.name !== 'AbortError') setError(error.message) })
      .finally(() => { if (active) setValidating(false) })

    return () => {
      active = false
      controller.abort()
    }
  }, [fetchUrl, path])

  return { response, error, validating }
}
