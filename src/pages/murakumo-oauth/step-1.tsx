import { ArrowRight, Sparkles, TriangleAlert } from 'lucide-react'
import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import OAuthCard, { Callout, inlineCodeClass } from '../../components/OAuthCard'
import PageLayout from '../../components/PageLayout'
import { useI18n } from '../../i18n'
import { requestLocale } from '../../i18n/server'
import { getOAuthPublicConfig, type OAuthPublicConfig } from '../../utils/apiConfig'
import { getPublicRuntimeConfig } from '../../utils/publicRuntimeConfig'
import { getPageProps, type PageProps } from '../../utils/serverConfig'

export default function OAuthStep1({
  brandIcons,
  oauthConfig,
}: PageProps & { oauthConfig: OAuthPublicConfig }) {
  const router = useRouter()
  const { t, rich } = useI18n()
  const configRows = [
    ['CLIENT_ID', oauthConfig.clientId],
    ['CLIENT_SECRET*', oauthConfig.obfuscatedClientSecret],
    ['REDIRECT_URI', oauthConfig.redirectUri],
    ['Auth API URL', oauthConfig.authApi],
    ['Drive API URL', oauthConfig.driveApi],
    ['API Scope', oauthConfig.scope],
  ]

  return (
    <PageLayout
      title={t('OAuth Step {{step}} - {{title}}', { step: 1, title: getPublicRuntimeConfig().title })}
      brandIcons={brandIcons}
    >
      <OAuthCard icon={Sparkles} step={1} stepTitle={t('Preparations')}>
        <Callout icon={TriangleAlert} iconClassName="text-warning">
          {t(
            'OAuth tokens are stored in Vercel Blob for this deployment. Make sure the Blob store is connected so the session survives redeploys and cold starts.',
          )}
        </Callout>

        <p>
          {rich(
            'Authorisation is required as no valid <code>access_token</code> or <code>refresh_token</code> is present on this deployed instance. Check the following configurations before proceeding with authorising Murakumo with your own Microsoft account.',
            { code: chunk => <code className={inlineCodeClass}>{chunk}</code> },
          )}
        </p>

        <dl className="well scroll-thin overflow-x-auto text-xs">
          {configRows.map(([label, value], i) => (
            <div
              key={label}
              className={`flex gap-3 px-3 py-2 ${i > 0 ? 'shadow-[inset_0_1px_0_0_var(--color-border)]' : ''}`}
            >
              <dt className="w-32 shrink-0 font-medium text-muted-foreground">{label}</dt>
              <dd className="whitespace-nowrap font-mono">{value}</dd>
            </div>
          ))}
        </dl>

        <Callout icon={TriangleAlert} iconClassName="text-warning">
          {t(
            'If you see anything missing or incorrect, update your Vercel environment variables and redeploy this instance.',
          )}
        </Callout>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              router.push('/murakumo-oauth/step-2')
            }}
          >
            <span>{t('Proceed to OAuth')}</span>
            <ArrowRight className="size-4" />
          </button>
        </div>
      </OAuthCard>
    </PageLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => ({
  props: { ...(await getPageProps(requestLocale(req))), oauthConfig: getOAuthPublicConfig() },
})
