import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { LoadingIcon } from '../../components/Loading'

import OAuthCard from '../../components/OAuthCard'
import PageLayout from '../../components/PageLayout'
import { FontAwesomeIcon } from '../../utils/fontawesome'
import { requestTokenWithAuthCode, sendTokenToServer } from '../../utils/oAuthHandler'
import { getServerSidePublicConfigProps, type PublicConfigProps } from '../../utils/serverConfig'

type StoreTokenStatus = 'idle' | 'loading' | 'stored' | 'error'

const storeTokenButtonContent = (status: StoreTokenStatus) => {
  switch (status) {
    case 'loading':
      return (
        <div>
          <span>Storing tokens</span> <LoadingIcon className="ml-1 inline h-4 w-4 animate-spin" />
        </div>
      )
    case 'stored':
      return (
        <div>
          <span>Stored! Going home...</span> <FontAwesomeIcon icon="check" />
        </div>
      )
    case 'error':
      return (
        <div>
          <span>Error storing the token</span> <FontAwesomeIcon icon="exclamation-circle" />
        </div>
      )
    default:
      return (
        <div>
          <span>Store tokens</span> <FontAwesomeIcon icon="key" />
        </div>
      )
  }
}

export default function OAuthStep3({
  accessToken,
  expiryTime,
  refreshToken,
  error,
  description,
  errorUri,
  publicConfig,
  brandIcons,
}: PublicConfigProps & {
  accessToken?: string
  expiryTime?: number
  refreshToken?: string
  error?: string | null
  description?: string
  errorUri?: string
}) {
  const router = useRouter()
  const [expiryTimeLeft, setExpiryTimeLeft] = useState(expiryTime)
  const remainingExpiryTime = expiryTimeLeft ?? 0

  useEffect(() => {
    if (!expiryTime) return

    const intervalId = setInterval(() => {
      setExpiryTimeLeft(timeLeft => {
        if (!timeLeft || timeLeft <= 1) {
          clearInterval(intervalId)
          return 0
        }

        return timeLeft - 1
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [expiryTime])

  const [storeTokenStatus, setStoreTokenStatus] = useState<StoreTokenStatus>('idle')

  const sendAuthTokensToServer = async () => {
    if (!accessToken || !refreshToken || !expiryTime) {
      return
    }

    setStoreTokenStatus('loading')

    try {
      await sendTokenToServer(accessToken, refreshToken, expiryTime)
      setStoreTokenStatus('stored')
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch {
      setStoreTokenStatus('error')
    }
  }

  return (
    <PageLayout title={`OAuth Step 3 - ${publicConfig.title}`} brandIcons={brandIcons}>
      <OAuthCard
        imageSrc="/images/fabulous-celebration.png"
        imageAlt="fabulous celebration"
        stepTitle="Step 3/3: Get access and refresh tokens"
      >
        {error ? (
          <div>
            <p className="py-1 font-medium text-red-500">
              <FontAwesomeIcon icon="exclamation-circle" className="mr-2" />
              <span>{`Whoops, looks like we got a problem: ${error}.`}</span>
            </p>
            <p className="my-2 whitespace-pre-line rounded border border-gray-400/20 bg-gray-50 p-2 font-mono text-sm opacity-80 dark:bg-gray-800">
              {description}
            </p>
            {errorUri && (
              <p>
                Check out{' '}
                <a
                  href={errorUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-500"
                >
                  {/* eslint-disable-next-line react/no-unescaped-entities */}
                  Microsoft's official explanation
                </a>{' '}
                on the error message.
              </p>
            )}
            <div className="mt-6 mb-2 text-right">
              <button
                className="rounded-lg bg-gradient-to-br from-red-500 to-orange-400 px-4 py-2.5 text-center font-medium text-sm text-white hover:bg-gradient-to-bl disabled:cursor-not-allowed disabled:grayscale"
                onClick={() => {
                  router.push('/murakumo-oauth/step-1')
                }}
              >
                <FontAwesomeIcon icon="arrow-left" /> <span>Restart</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="py-1 font-medium">Success! The API returned what we needed.</p>
            <ol className="py-1">
              {accessToken && (
                <li>
                  <FontAwesomeIcon icon={['far', 'check-circle']} className="text-green-500" />{' '}
                  <span>
                    Acquired access_token:{' '}
                    <code className="font-mono text-sm opacity-80">{`${accessToken.substring(0, 60)}...`}</code>
                  </span>
                </li>
              )}
              {refreshToken && (
                <li>
                  <FontAwesomeIcon icon={['far', 'check-circle']} className="text-green-500" />{' '}
                  <span>
                    Acquired refresh_token:{' '}
                    <code className="font-mono text-sm opacity-80">{`${refreshToken.substring(0, 60)}...`}</code>
                  </span>
                </li>
              )}
            </ol>

            <p className="py-1 font-medium text-sm text-teal-500">
              <FontAwesomeIcon icon="exclamation-circle" className="mr-1" /> These tokens may take a few seconds to
              populate after you click the button below. If you go back home and still see the welcome page telling you
              to re-authenticate, revisit home and do a hard refresh.
            </p>
            <p className="py-1">
              {`Final step, click the button below to store these tokens persistently before they expire after ${Math.floor(remainingExpiryTime / 60)} minutes ${remainingExpiryTime - Math.floor(remainingExpiryTime / 60) * 60} seconds. `}
              {`Don't worry, after storing them, Murakumo will take care of token refreshes and updates after your site goes live.`}
            </p>

            <div className="mt-6 mb-2 text-right">
              <button
                className={`rounded-lg bg-gradient-to-br px-4 py-2.5 text-center font-medium text-sm text-white hover:bg-gradient-to-bl ${
                  storeTokenStatus === 'error' ? 'from-red-500 to-orange-400' : 'from-green-500 to-teal-300'
                }`}
                onClick={sendAuthTokensToServer}
              >
                {storeTokenButtonContent(storeTokenStatus)}
              </button>
            </div>
          </div>
        )}
      </OAuthCard>
    </PageLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const baseProps = getServerSidePublicConfigProps()
  const rawAuthCode = query.authCode
  const authCode = Array.isArray(rawAuthCode) ? rawAuthCode[0] : rawAuthCode

  // Return if no auth code is present
  if (!authCode) {
    return {
      props: {
        ...baseProps.props,
        error: 'No auth code present',
        description: 'Where is the auth code? Did you follow step 2 you silly donut?',
      },
    }
  }

  const response = await requestTokenWithAuthCode(authCode)

  // If error response, return invalid
  if ('error' in response) {
    return {
      props: {
        ...baseProps.props,
        error: response.error,
        description: response.errorDescription,
        errorUri: response.errorUri,
      },
    }
  }

  const { expiryTime, accessToken, refreshToken } = response

  return {
    props: {
      ...baseProps.props,
      error: null,
      expiryTime,
      accessToken,
      refreshToken,
    },
  }
}
