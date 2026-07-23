import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import OAuthCard from '../../components/OAuthCard'
import PageLayout from '../../components/PageLayout'
import { getOAuthPublicConfig, type OAuthPublicConfig } from '../../utils/apiConfig'
import { FontAwesomeIcon } from '../../utils/fontawesome'
import { getServerSidePublicConfigProps, type PublicConfigProps } from '../../utils/serverConfig'

const labelClass =
  'bg-gray-50 px-3 py-1 text-left text-xs font-medium tracking-wider text-gray-700 uppercase dark:bg-gray-800 dark:text-gray-400'
const valueClass = 'px-3 py-1 whitespace-nowrap text-gray-500 dark:text-gray-400'

export default function OAuthStep1({
  publicConfig,
  brandIcons,
  oauthConfig,
}: PublicConfigProps & { oauthConfig: OAuthPublicConfig }) {
  const router = useRouter()
  const configRows = [
    ['CLIENT_ID', oauthConfig.clientId],
    ['CLIENT_SECRET*', oauthConfig.obfuscatedClientSecret],
    ['REDIRECT_URI', oauthConfig.redirectUri],
    ['Auth API URL', oauthConfig.authApi],
    ['Drive API URL', oauthConfig.driveApi],
    ['API Scope', oauthConfig.scope],
  ]

  return (
    <PageLayout title={`OAuth Step 1 - ${publicConfig.title}`} brandIcons={brandIcons}>
      <OAuthCard
        imageSrc="/images/fabulous-fireworks.png"
        imageAlt="fabulous fireworks"
        stepTitle="Step 1/3: Preparations"
      >
        <p className="py-1 font-medium text-sm text-yellow-400">
          <FontAwesomeIcon icon="exclamation-triangle" className="mr-1" /> OAuth tokens are stored in Vercel Blob for
          this deployment. Make sure the Blob store is connected so the session survives redeploys and cold starts.
        </p>

        <p className="py-1">
          Authorisation is required as no valid{' '}
          <code className="font-mono text-sm underline decoration-pink-600 decoration-wavy">access_token</code> or{' '}
          <code className="font-mono text-sm underline decoration-green-600 decoration-wavy">refresh_token</code> is
          present on this deployed instance. Check the following configurations before proceeding with authorising
          Murakumo with your own Microsoft account.
        </p>

        <div className="my-4 overflow-hidden">
          <table className="min-w-full table-auto">
            <tbody>
              {configRows.map(([label, value]) => (
                <tr key={label} className="border-y bg-white dark:border-gray-700 dark:bg-gray-900">
                  <td className={labelClass}>{label}</td>
                  <td className={valueClass}>
                    <code className="font-mono text-sm">{value}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="py-1 font-medium text-sm">
          <FontAwesomeIcon icon="exclamation-triangle" className="mr-1 text-yellow-400" /> If you see anything missing
          or incorrect, update your Vercel environment variables and redeploy this instance.
        </p>

        <div className="mt-6 mb-2 text-right">
          <button
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-center font-medium text-sm text-white hover:bg-gradient-to-bl"
            onClick={() => {
              router.push('/murakumo-oauth/step-2')
            }}
          >
            <span>Proceed to OAuth</span> <FontAwesomeIcon icon="arrow-right" />
          </button>
        </div>
      </OAuthCard>
    </PageLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async () => ({
  props: { ...getServerSidePublicConfigProps().props, oauthConfig: getOAuthPublicConfig() },
})
