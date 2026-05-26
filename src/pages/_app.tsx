import '@fortawesome/fontawesome-svg-core/styles.css'

import '../styles/globals.css'
import '../styles/markdown-github.css'
import '../utils/fontawesome'

import type { AppProps } from 'next/app'

import RouteProgressBar from '../components/RouteProgressBar'

const progressOptions = { showSpinner: false }

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <RouteProgressBar height={1} color="rgb(156, 163, 175, 0.9)" options={progressOptions} />

      <Component {...pageProps} />
    </>
  )
}
export default MyApp
