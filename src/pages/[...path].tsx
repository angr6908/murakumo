import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'

import DrivePage from '../components/DrivePage'
import { getServerSidePublicConfigProps, type PublicConfigProps } from '../utils/serverConfig'

export default function Folders({ publicConfig, brandIcons }: PublicConfigProps) {
  const { query } = useRouter()

  return (
    <DrivePage
      publicConfig={publicConfig}
      brandIcons={brandIcons}
      query={query}
      navClassName="mb-4 flex items-center justify-between space-x-3 px-4 sm:px-0 sm:pl-1"
    />
  )
}

export const getServerSideProps: GetServerSideProps = async () => getServerSidePublicConfigProps()
