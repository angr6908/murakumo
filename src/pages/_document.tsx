import Document, { Head, Html, Main, NextScript } from 'next/document'
import { readPublicRuntimeConfig, serializePublicRuntimeConfig } from '../utils/publicRuntimeConfig'

class MyDocument extends Document {
  render() {
    const publicConfig = readPublicRuntimeConfig()

    return (
      <Html>
        <Head>
          <meta name="description" content="OneDrive Vercel Index" />
          <link rel="icon" href={publicConfig.icon || '/favicon.ico'} />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          {publicConfig.googleFontLinks.map(link => (
            <link key={link} rel="stylesheet" href={link} />
          ))}
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__ONEDRIVE_INDEX_PUBLIC_CONFIG__=${serializePublicRuntimeConfig()};`,
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
