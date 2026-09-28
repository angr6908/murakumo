import type { GetStaticPaths, GetStaticProps } from 'next'
import { useRouter } from 'next/router'
import type { ReactElement } from 'react'

import Breadcrumb from '../../../components/Breadcrumb'
import FileListing from '../../../components/FileListing'
import PageLayout from '../../../components/PageLayout'
import SwitchLayout from '../../../components/SwitchLayout'
import { isLocale, locales } from '../../../i18n/locales'
import { getPageProps, type PageProps } from '../../../utils/serverConfig'

function Drive() {
  const { query } = useRouter()

  return (
    <div className="mx-auto w-full max-w-5xl py-4 sm:p-4">
      <nav className="mb-3 flex items-center justify-between gap-3 px-2 sm:px-0">
        <Breadcrumb query={query} />
        <SwitchLayout />
      </nav>
      <FileListing query={query} />
    </div>
  )
}

// Persistent layout. `_app` renders this around the page, and since both the index and folder pages
// return the same `PageLayout` at the same position, React keeps it (and the Navbar/logo) mounted
// across route changes — only the inner content swaps. Without this the navbar remounts on every
// `/` <-> `/folder` navigation, which is what makes the logo flicker.
Drive.getLayout = (page: ReactElement, { brandIcons }: PageProps) => (
  <PageLayout brandIcons={brandIcons}>{page}</PageLayout>
)
export default Drive

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: locales.map(lang => ({ params: { lang, path: [] } })),
  fallback: 'blocking',
})

export const getStaticProps: GetStaticProps = async ({ params }) => {
  if (!isLocale(params?.lang)) return { notFound: true }
  return { props: await getPageProps(params.lang) }
}
