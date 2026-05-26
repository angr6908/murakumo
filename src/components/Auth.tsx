import { FontAwesomeIcon } from '../utils/fontawesome'

import Image from 'next/image'
import { useRouter } from 'next/router'
import { FC, useState } from 'react'

import { matchProtectedRoute } from '../utils/protectedRouteHandler'
import useLocalStorage from '../utils/useLocalStorage'

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
    <div className="mx-auto flex max-w-sm flex-col space-y-4 md:my-10">
      <div className="mx-auto w-3/4 md:w-5/6">
        <Image src={'/images/fabulous-wapmire-weekdays.png'} alt="authenticate" width={912} height={912} priority />
      </div>
      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{'Enter Password'}</div>

      <p className="text-sm font-medium text-gray-500">
        {'This route (the folder itself and the files inside) is password protected. ' +
          'If you know the password, please enter it below.'}
      </p>

      <div className="flex items-center space-x-2">
        <input
          className="flex-1 rounded border border-gray-600/10 p-2 font-mono dark:bg-gray-600 dark:text-white"
          type="password"
          placeholder="************"
          value={token}
          onChange={e => setToken(e.target.value)}
          onKeyDown={e => ['Enter', 'NumpadEnter'].includes(e.key) && submit()}
        />
        <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500" onClick={submit}>
          <FontAwesomeIcon icon="arrow-right" />
        </button>
      </div>
    </div>
  )
}

export default Auth
