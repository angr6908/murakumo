import type { ParsedUrlQuery } from 'node:querystring'
import type { BrandIcons } from '../utils/brandIcons'
import type { PublicRuntimeConfig } from '../utils/publicRuntimeConfig'

import Breadcrumb from './Breadcrumb'
import FileListing from './FileListing'
import PageLayout from './PageLayout'
import SwitchLayout from './SwitchLayout'

const defaultNavClassName = 'mb-4 flex items-center justify-between px-4 sm:px-0 sm:pl-1'

export default function DrivePage({
  publicConfig,
  brandIcons,
  query,
  navClassName = defaultNavClassName,
}: {
  publicConfig: PublicRuntimeConfig
  brandIcons?: BrandIcons
  query?: ParsedUrlQuery
  navClassName?: string
}) {
  return (
    <PageLayout title={publicConfig.title} brandIcons={brandIcons}>
      <div className="mx-auto w-full max-w-5xl py-4 sm:p-4">
        <nav className={navClassName}>
          <Breadcrumb query={query} />
          <SwitchLayout />
        </nav>
        <FileListing query={query} />
      </div>
    </PageLayout>
  )
}
