import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'

import { FontAwesomeIcon } from '../../utils/fontawesome'
import OAuthCard from '../../components/OAuthCard'
import PageLayout from '../../components/PageLayout'
import apiConfig from '../../utils/apiConfig'
import { getServerSidePublicConfigProps, type PublicRuntimeConfig } from '../../utils/publicRuntimeConfig'

type OAuthConfig = {
  clientId: string
  obfuscatedClientSecret: string
  redirectUri: string
  authApi: string
  driveApi: string
  scope: string
}

const labelClass =
  'bg-gray-50 px-3 py-1 text-left text-xs font-medium tracking-wider text-gray-700 uppercase dark:bg-gray-800 dark:text-gray-400'
const valueClass = 'px-3 py-1 whitespace-nowrap text-gray-500 dark:text-gray-400'

export default function OAuthStep1({
  publicConfig,
  oauthConfig,
}: {
  publicConfig: PublicRuntimeConfig
  oauthConfig: OAuthConfig
}) {
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
    <PageLayout title={`OAuth Step 1 - ${publicConfig.title}`}>
      <OAuthCard
        imageSrc="/images/fabulous-fireworks.png"
        imageAlt="fabulous fireworks"
        stepTitle="Step 1/3: Preparations"
      >
        <p className="py-1 text-sm font-medium text-yellow-400">
          <FontAwesomeIcon icon="exclamation-triangle" className="mr-1" /> OAuth tokens are stored in Vercel Blob for
          this deployment. Make sure the Blob store is connected so the session survives redeploys and cold starts.
        </p>

        <p className="py-1">
          Authorisation is required as no valid{' '}
          <code className="font-mono text-sm underline decoration-pink-600 decoration-wavy">access_token</code> or{' '}
          <code className="font-mono text-sm underline decoration-green-600 decoration-wavy">refresh_token</code> is
          present on this deployed instance. Check the following configurations before proceeding with authorising
          onedrive-vercel-index-plus with your own Microsoft account.
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

        <p className="py-1 text-sm font-medium">
          <FontAwesomeIcon icon="exclamation-triangle" className="mr-1 text-yellow-400" /> If you see anything missing
          or incorrect, update your Vercel environment variables and redeploy this instance.
        </p>

        <div className="mt-6 mb-2 text-right">
          <button
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-gradient-to-bl"
            onClick={() => {
              router.push('/onedrive-vercel-index-plus-oauth/step-2')
            }}
          >
            <span>Proceed to OAuth</span> <FontAwesomeIcon icon="arrow-right" />
          </button>
        </div>
      </OAuthCard>
    </PageLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  const baseProps = getServerSidePublicConfigProps()

  return {
    props: {
      ...baseProps.props,
      oauthConfig: {
        clientId: apiConfig.clientId,
        obfuscatedClientSecret: apiConfig.obfuscatedClientSecret,
        redirectUri: apiConfig.redirectUri,
        authApi: apiConfig.authApi,
        driveApi: apiConfig.driveApi,
        scope: apiConfig.scope,
      },
    },
  }
}
