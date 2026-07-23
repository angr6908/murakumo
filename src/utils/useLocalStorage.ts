import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react'

type SetValue<T> = Dispatch<SetStateAction<T>>

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  // Held in a ref so a caller passing a fresh object/array literal each render
  // does not invalidate readValue and re-run the effects below.
  const initialValueRef = useRef(initialValue)

  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialValueRef.current
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValueRef.current
    } catch {
      return initialValueRef.current
    }
  }, [key])

  const [storedValue, setStoredValue] = useState<T>(readValue)

  const setValue: SetValue<T> = value => {
    if (typeof window === 'undefined') return
    try {
      const newValue = value instanceof Function ? value(storedValue) : value
      window.localStorage.setItem(key, JSON.stringify(newValue))
      setStoredValue(newValue)
      window.dispatchEvent(new Event('local-storage'))
    } catch {}
  }

  useEffect(() => {
    setStoredValue(readValue())
  }, [readValue])

  useEffect(() => {
    const handler = () => setStoredValue(readValue())
    window.addEventListener('storage', handler)
    window.addEventListener('local-storage', handler)
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('local-storage', handler)
    }
  }, [readValue])

  return [storedValue, setValue]
}

export default useLocalStorage
