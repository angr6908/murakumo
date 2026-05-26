import { GetServerSideProps } from 'next'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { FontAwesomeIcon } from '../../utils/fontawesome'

import OAuthCard from '../../components/OAuthCard'
import PageLayout from '../../components/PageLayout'
import { LoadingIcon } from '../../components/Loading'
import apiConfig from '../../utils/apiConfig'
import { extractAuthCodeFromRedirected, generateAuthorisationUrl } from '../../utils/oAuthHandler'
import { getServerSidePublicConfigProps, type PublicRuntimeConfig } from '../../utils/publicRuntimeConfig'

type OAuthConfig = {
  clientId: string
  redirectUri: string
  authApi: string
  scope: string
}

export default function OAuthStep2({
  publicConfig,
  oauthConfig,
}: {
  publicConfig: PublicRuntimeConfig
  oauthConfig: OAuthConfig
}) {
  const router = useRouter()

  const [oAuthRedirectedUrl, setOAuthRedirectedUrl] = useState('')
  const [authCode, setAuthCode] = useState('')
  const [buttonLoading, setButtonLoading] = useState(false)

  const oAuthUrl = generateAuthorisationUrl(oauthConfig)

  return (
    <PageLayout title={`OAuth Step 2 - ${publicConfig.title}`}>
      <OAuthCard
        imageSrc="/images/fabulous-come-back-later.png"
        imageAlt="fabulous come back later"
        stepTitle="Step 2/3: Get authorisation code"
      >
        <p className="py-1 text-sm font-medium text-red-400">
          <FontAwesomeIcon icon="exclamation-circle" className="mr-1" /> If you are not the owner of this website, stop
          now, as continuing with this process may expose your personal files in OneDrive.
        </p>

        <div
          className="relative my-2 cursor-pointer rounded border border-gray-500/50 bg-gray-50 font-mono text-sm hover:opacity-80 dark:bg-gray-800"
          onClick={() => {
            window.open(oAuthUrl)
          }}
        >
          <div className="absolute top-0 right-0 p-1 opacity-60">
            <FontAwesomeIcon icon="external-link-alt" />
          </div>
          <pre className="overflow-x-auto p-2 whitespace-pre-wrap">
            <code>{oAuthUrl}</code>
          </pre>
        </div>

        <p className="py-1">
          The OAuth link for getting the authorisation code has been created. Click on the link above to get the{' '}
          <b className="underline decoration-yellow-400 decoration-wavy">authorisation code</b>. Your browser will
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          open a new tab to Microsoft's account login page. After logging in and authenticating with your Microsoft
          account, you will be redirected to a blank page on localhost. Paste{' '}
          <b className="underline decoration-teal-500 decoration-wavy">the entire redirected URL</b> down below.
        </p>

        <div className="mx-auto my-4 w-2/3 overflow-hidden rounded">
          <Image src="/images/step-2-screenshot.png" width={1466} height={607} alt="step 2 screenshot" />
        </div>

        <input
          className={`my-2 w-full flex-1 rounded border bg-gray-50 p-2 font-mono text-sm font-medium dark:bg-gray-800 dark:text-white ${
            authCode ? 'border-green-500/50' : 'border-red-500/50'
          }`}
          type="text"
          placeholder="http://localhost/?code=M.R3_BAY.c0..."
          value={oAuthRedirectedUrl}
          onChange={e => {
            setOAuthRedirectedUrl(e.target.value)
            setAuthCode(extractAuthCodeFromRedirected(e.target.value, oauthConfig.redirectUri))
          }}
        />

        <p className="py-1">The authorisation code extracted is:</p>
        <p className="my-2 truncate overflow-hidden rounded border border-gray-400/20 bg-gray-50 p-2 font-mono text-sm opacity-80 dark:bg-gray-800">
          {authCode ?? <span className="animate-pulse">Waiting for code...</span>}
        </p>

        <p>
          {authCode
            ? '✅ You can now proceed onto the next step: requesting your access token and refresh token.'
            : '❌ No valid code extracted.'}
        </p>

        <div className="mt-6 mb-2 text-right">
          <button
            className="rounded-lg bg-gradient-to-br from-green-500 to-cyan-400 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-gradient-to-bl disabled:cursor-not-allowed disabled:grayscale"
            disabled={authCode === ''}
            onClick={() => {
              setButtonLoading(true)
              router.push({ pathname: '/onedrive-vercel-index-plus-oauth/step-3', query: { authCode } })
            }}
          >
            {buttonLoading ? (
              <>
                <span>Requesting tokens</span> <LoadingIcon className="ml-1 inline h-4 w-4 animate-spin" />
              </>
            ) : (
              <>
                <span>Get tokens</span> <FontAwesomeIcon icon="arrow-right" />
              </>
            )}
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
        redirectUri: apiConfig.redirectUri,
        authApi: apiConfig.authApi,
        scope: apiConfig.scope,
      },
    },
  }
}
