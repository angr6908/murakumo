import '../styles/globals.css'
import '../styles/markdown.css'

import { Tooltip } from '@videojs/react'
import { LucideProvider } from 'lucide-react'
import type { NextPage } from 'next'
import type { AppProps } from 'next/app'
import type { ReactElement, ReactNode } from 'react'

import { I18nProvider } from '../i18n'

// Pages may attach `getLayout` to wrap themselves in a layout that persists across route changes.
type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement, pageProps: any) => ReactNode
}

function MyApp({ Component, pageProps }: AppProps & { Component: NextPageWithLayout }) {
  const getLayout = Component.getLayout ?? ((page: ReactElement) => page)
  return (
    <I18nProvider locale={pageProps.locale} messages={pageProps.messages}>
      <LucideProvider size={18} strokeWidth={2} nonScalingStroke>
        <Tooltip.Provider>{getLayout(<Component {...pageProps} />, pageProps)}</Tooltip.Provider>
      </LucideProvider>
    </I18nProvider>
  )
}
export default MyApp
