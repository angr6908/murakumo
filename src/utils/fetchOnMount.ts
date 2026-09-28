import { useEffect, useState } from 'react'

export default function useFileContent(url: string): { response: string; error: string; validating: boolean } {
  const [response, setResponse] = useState('')
  const [validating, setValidating] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    setValidating(true)
    setError('')

    fetch(url, { headers: { Accept: 'text/plain, */*' }, signal })
      .then(response => {
        if (!response.ok) throw new Error(response.statusText || `Request failed with ${response.status}`)
        return response.text()
      })
      .then(text => {
        if (!signal.aborted) setResponse(text)
      })
      .catch(error => {
        if (!signal.aborted) setError(error.message)
      })
      .finally(() => {
        if (!signal.aborted) setValidating(false)
      })

    return () => controller.abort()
  }, [url])

  return { response, error, validating }
}
