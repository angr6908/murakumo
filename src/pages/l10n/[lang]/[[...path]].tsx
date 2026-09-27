import type { GetStaticPaths, GetStaticProps } from 'next'
import { useRouter } from 'next/router'

import DrivePage, { driveLayout } from '../../../components/DrivePage'
import { isLocale, locales } from '../../../i18n/locales'
import { getLocaleProps } from '../../../i18n/server'
import { getServerSidePublicConfigProps } from '../../../utils/serverConfig'

function Drive() {
  const { query } = useRouter()

  return <DrivePage query={query} />
}
Drive.getLayout = driveLayout
export default Drive

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: locales.map(lang => ({ params: { lang, path: [] } })),
  fallback: 'blocking',
})

export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!isLocale(params?.lang)) return { notFound: true }
  return {
    props: { ...getServerSidePublicConfigProps().props, ...(await getLocaleProps(params.lang)) },
  }
}
