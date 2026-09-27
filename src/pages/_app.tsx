import '../styles/globals.css'
import '../styles/markdown.css'

import { Tooltip } from '@videojs/react'
import { LucideProvider } from 'lucide-react'
import type { NextPage } from 'next'
import type { AppProps } from 'next/app'
import type { ReactElement, ReactNode } from 'react'

// Pages may attach `getLayout` to wrap themselves in a layout that persists across route changes.
type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement, pageProps: any) => ReactNode
}

function MyApp({ Component, pageProps }: AppProps & { Component: NextPageWithLayout }) {
  const getLayout = Component.getLayout ?? ((page: ReactElement) => page)
  return (
    <LucideProvider size={18} strokeWidth={2} nonScalingStroke>
      <Tooltip.Provider>{getLayout(<Component {...pageProps} />, pageProps)}</Tooltip.Provider>
    </LucideProvider>
  )
}
export default MyApp
