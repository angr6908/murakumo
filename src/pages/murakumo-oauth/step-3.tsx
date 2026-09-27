import { CheckIcon } from '@videojs/react/icons'
import { ArrowLeft, CircleAlert, CircleCheck, Info, KeyRound, PartyPopper } from 'lucide-react'
import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { Spinner } from '../../components/Loading'

import OAuthCard, { Callout, inlineCodeClass } from '../../components/OAuthCard'
import PageLayout from '../../components/PageLayout'
import { useI18n } from '../../i18n'
import { getLocaleProps, requestLocale } from '../../i18n/server'
import { requestTokenWithAuthCode, sendTokenToServer } from '../../utils/oAuthHandler'
import { getServerSidePublicConfigProps, type PublicConfigProps } from '../../utils/serverConfig'

type StoreTokenStatus = 'idle' | 'loading' | 'stored' | 'error'

const storeTokenButtonContent = (status: StoreTokenStatus, t: (key: string) => string) => {
  switch (status) {
    case 'loading':
      return (
        <>
          <span>{t('Storing tokens')}</span>
          <Spinner />
        </>
      )
    case 'stored':
      return (
        <>
          <span>{t('Stored! Going home...')}</span>
          <CheckIcon className="size-4.5" />
        </>
      )
    case 'error':
      return (
        <>
          <span>{t('Error storing the token')}</span>
          <CircleAlert className="size-4" />
        </>
      )
    default:
      return (
        <>
          <span>{t('Store tokens')}</span>
          <KeyRound className="size-4" />
        </>
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
  const { t, rich } = useI18n()
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
    <PageLayout
      title={t('OAuth Step {{step}} - {{title}}', { step: 3, title: publicConfig.title })}
      brandIcons={brandIcons}
    >
      <OAuthCard icon={error ? CircleAlert : PartyPopper} step={3} stepTitle={t('Get access and refresh tokens')}>
        {error ? (
          <>
            <Callout icon={CircleAlert} iconClassName="text-danger">
              <span className="font-medium">
                {t('Whoops, looks like we got a problem: {{error}}.', { error: t(error) })}
              </span>
            </Callout>
            <p className="well whitespace-pre-line px-3 py-2 font-mono text-muted-foreground text-xs">
              {description && t(description)}
            </p>
            {errorUri && (
              <p>
                {rich("Check out <link>Microsoft's official explanation</link> on the error message.", {
                  link: chunk => (
                    <a href={errorUri} target="_blank" rel="noopener noreferrer" className="link">
                      {chunk}
                    </a>
                  ),
                })}
              </p>
            )}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  router.push('/murakumo-oauth/step-1')
                }}
              >
                <ArrowLeft className="size-4" />
                <span>{t('Restart')}</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="font-medium">{t('Success! The API returned what we needed.')}</p>
            <ul className="flex flex-col gap-2">
              {accessToken && (
                <li className="flex items-center gap-2">
                  <CircleCheck className="shrink-0 text-success" />
                  <span className="min-w-0 truncate">
                    {t('Acquired access_token:')}{' '}
                    <code className={inlineCodeClass}>{`${accessToken.substring(0, 60)}...`}</code>
                  </span>
                </li>
              )}
              {refreshToken && (
                <li className="flex items-center gap-2">
                  <CircleCheck className="shrink-0 text-success" />
                  <span className="min-w-0 truncate">
                    {t('Acquired refresh_token:')}{' '}
                    <code className={inlineCodeClass}>{`${refreshToken.substring(0, 60)}...`}</code>
                  </span>
                </li>
              )}
            </ul>

            <Callout icon={Info} iconClassName="text-muted-foreground">
              {t(
                'These tokens may take a few seconds to populate after you click the button below. If you go back home and still see the welcome page telling you to re-authenticate, revisit home and do a hard refresh.',
              )}
            </Callout>
            <p>
              {t(
                'Final step, click the button below to store these tokens persistently before they expire after {{minutes}} minutes {{seconds}} seconds.',
                {
                  minutes: Math.floor(remainingExpiryTime / 60),
                  seconds: remainingExpiryTime - Math.floor(remainingExpiryTime / 60) * 60,
                },
              )}{' '}
              {t(
                "Don't worry, after storing them, Murakumo will take care of token refreshes and updates after your site goes live.",
              )}
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                className={`btn ${storeTokenStatus === 'error' ? 'btn-danger' : 'btn-primary'}`}
                onClick={sendAuthTokensToServer}
              >
                {storeTokenButtonContent(storeTokenStatus, t)}
              </button>
            </div>
          </>
        )}
      </OAuthCard>
    </PageLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ query, req }) => {
  const baseProps = {
    ...getServerSidePublicConfigProps().props,
    ...(await getLocaleProps(requestLocale(req))),
  }
  const rawAuthCode = query.authCode
  const authCode = Array.isArray(rawAuthCode) ? rawAuthCode[0] : rawAuthCode

  // Return if no auth code is present
  if (!authCode) {
    return {
      props: {
        ...baseProps,
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
        ...baseProps,
        error: response.error,
        description: response.errorDescription,
        errorUri: response.errorUri,
      },
    }
  }

  const { expiryTime, accessToken, refreshToken } = response

  return {
    props: {
      ...baseProps,
      error: null,
      expiryTime,
      accessToken,
      refreshToken,
    },
  }
}
