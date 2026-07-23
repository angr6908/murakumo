import { useRouter } from 'next/router'
import { getStoredToken } from './protectedRouteHandler'

/** The current drive path and the hashed protected-route token that goes with it. */
export function useCurrentPathToken() {
  const { asPath } = useRouter()
  return { asPath, hashedToken: getStoredToken(asPath) }
}
