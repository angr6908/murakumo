import Document, { Head, Html, Main, NextScript } from 'next/document'
import { defaultLocale, isLocale } from '../i18n/locales'
import { serializedPublicRuntimeConfig } from '../utils/publicRuntimeConfig'
import siteConfig from '../utils/siteConfig'

class MyDocument extends Document {
  render() {
    const locale = this.props.__NEXT_DATA__.props?.pageProps?.locale

    return (
      <Html lang={isLocale(locale) ? locale : defaultLocale}>
        <Head>
          <meta name="description" content="OneDrive Vercel Index" />
          <link rel="icon" href={siteConfig.icon} />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          {siteConfig.googleFontLinks.map(link => (
            <link key={link} rel="stylesheet" href={link} />
          ))}
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__ONEDRIVE_INDEX_PUBLIC_CONFIG__=${serializedPublicRuntimeConfig};`,
            }}
          />
          {/*
            Kick off the folder-listing request during HTML parse, so it runs in parallel with the
            JS bundle download instead of only after hydration. SWR's fetcher adopts this in-flight
            promise (see consumeListPrefetch), so the exact same request just starts sooner — no
            change to caching, freshness, or server load. Skipped for OAuth pages (not listings)
            and protected routes (their request needs a client token this early script can't hash).
          */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{
var p=location.pathname;
if(p.indexOf('/murakumo-oauth')===0)return;
var apiPath='/'+p.split('/').filter(Boolean).map(function(s){return encodeURIComponent(decodeURIComponent(s))}).join('/');
var routes=(window.__ONEDRIVE_INDEX_PUBLIC_CONFIG__||{}).protectedRoutes||[];
if(routes.some(function(r){return r&&apiPath.startsWith(r.split('/').map(encodeURIComponent).join('/'))}))return;
window.__MURAKUMO_LIST_PREFETCH__={path:apiPath,promise:fetch('/api/?path='+apiPath,{headers:{accept:'application/json'}}).then(function(res){if(!res.ok)throw new Error(String(res.status));return res.json()})};
}catch(e){}})();`,
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
