import { ArrowRight, Lock } from 'lucide-react'
import { useRouter } from 'next/router'
import { type FC, useState } from 'react'

import { matchProtectedRoute } from '../utils/protectedRouteHandler'
import useLocalStorage from '../utils/useLocalStorage'
import Tip from './Tip'

const Auth: FC<{ redirect: string }> = ({ redirect }) => {
  const authTokenPath = matchProtectedRoute(redirect)

  const router = useRouter()
  const [token, setToken] = useState('')
  const [, setPersistedToken] = useLocalStorage(authTokenPath, '')

  const submit = () => {
    setPersistedToken(token)
    router.reload()
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-12 text-center text-control">
      <div className="grid size-11 place-items-center rounded-full bg-accent">
        <Lock />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="dialog-title">{'Enter Password'}</div>
        <p className="text-muted-foreground">
          {'This route (the folder itself and the files inside) is password protected. ' +
            'If you know the password, please enter it below.'}
        </p>
      </div>

      <div className="flex w-full items-center gap-2">
        <input
          className="input font-mono"
          type="password"
          placeholder="************"
          aria-label="Password"
          value={token}
          onChange={e => setToken(e.target.value)}
          onKeyDown={e => ['Enter', 'NumpadEnter'].includes(e.key) && submit()}
        />
        <Tip label={'Unlock'}>
          <button type="button" className="btn btn-primary btn-icon" aria-label="Unlock" onClick={submit}>
            <ArrowRight />
          </button>
        </Tip>
      </div>
    </div>
  )
}

export default Auth
