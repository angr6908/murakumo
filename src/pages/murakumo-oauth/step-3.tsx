import { CheckIcon } from '@videojs/react/icons'
import { ArrowLeft, CircleAlert, CircleCheck, Info, KeyRound, PartyPopper } from 'lucide-react'
import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { type ReactNode, useEffect, useState } from 'react'
import { Spinner } from '../../components/Loading'

import OAuthCard, { Callout, inlineCodeClass } from '../../components/OAuthCard'
import PageLayout from '../../components/PageLayout'
import { useI18n } from '../../i18n'
import { requestLocale } from '../../i18n/server'
import { requestTokenWithAuthCode, sendTokenToServer } from '../../utils/oAuthHandler'
import { getPublicRuntimeConfig } from '../../utils/publicRuntimeConfig'
import { getPageProps, type PageProps } from '../../utils/serverConfig'

type StoreTokenStatus = 'idle' | 'loading' | 'stored' | 'error'

const storeTokenButtonContent: Record<StoreTokenStatus, [label: string, icon: ReactNode]> = {
  idle: ['Store tokens', <KeyRound className="size-4" />],
  loading: ['Storing tokens', <Spinner />],
  stored: ['Stored! Going home...', <CheckIcon className="size-4.5" />],
  error: ['Error storing the token', <CircleAlert className="size-4" />],
}

export default function OAuthStep3({
  accessToken,
  expiryTime,
  refreshToken,
  error,
  description,
  errorUri,
  brandIcons,
}: PageProps & {
  accessToken?: string
  expiryTime?: number
  refreshToken?: string
  error?: string | null
  description?: string
  errorUri?: string
}) {
  const router = useRouter()
  const { t, rich } = useI18n()
  const [expiryTimeLeft = 0, setExpiryTimeLeft] = useState(expiryTime)

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
      title={t('OAuth Step {{step}} - {{title}}', { step: 3, title: getPublicRuntimeConfig().title })}
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
              {[
                [t('Acquired access_token:'), accessToken],
                [t('Acquired refresh_token:'), refreshToken],
              ].map(
                ([label, token]) =>
                  token && (
                    <li key={label} className="flex items-center gap-2">
                      <CircleCheck className="shrink-0 text-success" />
                      <span className="min-w-0 truncate">
                        {label} <code className={inlineCodeClass}>{`${token.substring(0, 60)}...`}</code>
                      </span>
                    </li>
                  ),
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
                  minutes: Math.floor(expiryTimeLeft / 60),
                  seconds: expiryTimeLeft % 60,
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
                <span>{t(storeTokenButtonContent[storeTokenStatus][0])}</span>
                {storeTokenButtonContent[storeTokenStatus][1]}
              </button>
            </div>
          </>
        )}
      </OAuthCard>
    </PageLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ query, req }) => {
  const authCode = [query.authCode].flat()[0]
  const response = authCode
    ? await requestTokenWithAuthCode(authCode)
    : {
        error: 'No auth code present',
        errorDescription: 'Where is the auth code? Did you follow step 2 you silly donut?',
        errorUri: '',
      }
  const result =
    'error' in response
      ? { error: response.error, description: response.errorDescription, errorUri: response.errorUri }
      : { error: null, ...response }

  return { props: { ...(await getPageProps(requestLocale(req))), ...result } }
}
