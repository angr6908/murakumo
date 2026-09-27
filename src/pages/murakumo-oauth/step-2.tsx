import { ArrowRight, CircleAlert, CircleCheck, CircleX, ExternalLink, KeyRound } from 'lucide-react'
import type { GetServerSideProps } from 'next'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { Spinner } from '../../components/Loading'

import OAuthCard, { Callout } from '../../components/OAuthCard'
import PageLayout from '../../components/PageLayout'
import { useI18n } from '../../i18n'
import { getLocaleProps, requestLocale } from '../../i18n/server'
import { getOAuthPublicConfig, type OAuthPublicConfig } from '../../utils/apiConfig'
import { extractAuthCodeFromRedirected, generateAuthorisationUrl } from '../../utils/oAuthHandler'
import { getServerSidePublicConfigProps, type PublicConfigProps } from '../../utils/serverConfig'

export default function OAuthStep2({
  publicConfig,
  brandIcons,
  oauthConfig,
}: PublicConfigProps & { oauthConfig: OAuthPublicConfig }) {
  const router = useRouter()
  const { t, rich } = useI18n()

  const [oAuthRedirectedUrl, setOAuthRedirectedUrl] = useState('')
  const [buttonLoading, setButtonLoading] = useState(false)

  const authCode = extractAuthCodeFromRedirected(oAuthRedirectedUrl, oauthConfig.redirectUri)
  const oAuthUrl = generateAuthorisationUrl(oauthConfig)

  return (
    <PageLayout
      title={t('OAuth Step {{step}} - {{title}}', { step: 2, title: publicConfig.title })}
      brandIcons={brandIcons}
    >
      <OAuthCard icon={KeyRound} step={2} stepTitle={t('Get authorisation code')}>
        <Callout icon={CircleAlert} iconClassName="text-danger">
          {t(
            'If you are not the owner of this website, stop now, as continuing with this process may expose your personal files in OneDrive.',
          )}
        </Callout>

        <a
          href={oAuthUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="well group flex items-start gap-2 px-3 py-2.5 transition-colors hover:bg-accent"
        >
          <code className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-xs">{oAuthUrl}</code>
          <ExternalLink className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
        </a>

        <p>
          {rich(
            "The OAuth link for getting the authorisation code has been created. Click on the link above to get the <b>authorisation code</b>. Your browser will open a new tab to Microsoft's account login page. After logging in and authenticating with your Microsoft account, you will be redirected to a blank page on localhost. Paste <b>the entire redirected URL</b> down below.",
            { b: chunk => <b className="font-semibold">{chunk}</b> },
          )}
        </p>

        <div className="mx-auto w-full overflow-hidden rounded-item shadow-[0_0_0_1px_var(--color-border)] sm:w-2/3">
          <Image src="/images/step-2-screenshot.png" width={1466} height={607} alt="step 2 screenshot" />
        </div>

        <input
          className="input font-mono text-xs"
          type="text"
          placeholder="http://localhost/?code=M.R3_BAY.c0..."
          aria-label={t('Redirected URL')}
          aria-invalid={oAuthRedirectedUrl !== '' && !authCode}
          value={oAuthRedirectedUrl}
          onChange={e => setOAuthRedirectedUrl(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <div className="font-medium text-muted-foreground text-xs">{t('The authorisation code extracted is:')}</div>
          <div className="well flex min-w-0 items-center gap-2 px-3 py-2 font-mono text-xs">
            {authCode ? (
              <span className="truncate">{authCode}</span>
            ) : (
              <>
                <Spinner className="size-4" />
                <span className="text-muted-foreground">{t('Waiting for code...')}</span>
              </>
            )}
          </div>
        </div>

        <p className="flex items-center gap-2 text-control">
          {authCode ? (
            <>
              <CircleCheck className="shrink-0 text-success" />
              <span>
                {t('You can now proceed onto the next step: requesting your access token and refresh token.')}
              </span>
            </>
          ) : (
            <>
              <CircleX className="shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">{t('No valid code extracted.')}</span>
            </>
          )}
        </p>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={authCode === ''}
            onClick={() => {
              setButtonLoading(true)
              router.push({ pathname: '/murakumo-oauth/step-3', query: { authCode } })
            }}
          >
            {buttonLoading ? (
              <>
                <span>{t('Requesting tokens')}</span>
                <Spinner />
              </>
            ) : (
              <>
                <span>{t('Get tokens')}</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </OAuthCard>
    </PageLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => ({
  props: {
    ...getServerSidePublicConfigProps().props,
    ...(await getLocaleProps(requestLocale(req))),
    oauthConfig: getOAuthPublicConfig(),
  },
})
