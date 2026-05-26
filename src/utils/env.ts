export const getEnv = (key: string, fallback = ''): string => process.env[key] || fallback

export const parseJsonEnv = <T>(key: string, fallback: T): T => {
  const value = getEnv(key)

  try {
    return value ? (JSON.parse(value) as T) : fallback
  } catch {
    return fallback
  }
}

export const parseNumberEnv = (key: string, fallback: number): number => {
  const value = getEnv(key)
  const parsed = Number(value)

  return Number.isFinite(parsed) && value ? parsed : fallback
}
