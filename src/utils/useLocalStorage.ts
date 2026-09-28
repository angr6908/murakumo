import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react'

type SetValue<T> = Dispatch<SetStateAction<T>>

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  // Held in a ref so a caller passing a fresh object/array literal each render
  // does not invalidate readValue and re-run the effects below.
  const initialValueRef = useRef(initialValue)

  const readValue = useCallback((): T => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValueRef.current
    } catch {
      return initialValueRef.current
    }
  }, [key])

  const [storedValue, setStoredValue] = useState<T>(() => initialValueRef.current)

  const setValue: SetValue<T> = value => {
    try {
      const newValue = value instanceof Function ? value(storedValue) : value
      window.localStorage.setItem(key, JSON.stringify(newValue))
      setStoredValue(newValue)
      window.dispatchEvent(new Event('local-storage'))
    } catch {}
  }

  useEffect(() => {
    const sync = () => setStoredValue(readValue())
    const controller = new AbortController()
    sync()
    window.addEventListener('storage', sync, { signal: controller.signal })
    window.addEventListener('local-storage', sync, { signal: controller.signal })
    return () => controller.abort()
  }, [readValue])

  return [storedValue, setValue]
}

export default useLocalStorage
