import type { ReactElement } from 'react'

import type { QueryMap } from '../utils/drivePath'
import type { PublicConfigProps } from '../utils/serverConfig'
import Breadcrumb from './Breadcrumb'
import FileListing from './FileListing'
import PageLayout from './PageLayout'
import SwitchLayout from './SwitchLayout'

export default function DrivePage({ query }: { query?: QueryMap }) {
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
export function driveLayout(page: ReactElement, pageProps: PublicConfigProps) {
  return (
    <PageLayout title={pageProps.publicConfig.title} brandIcons={pageProps.brandIcons}>
      {page}
    </PageLayout>
  )
}
