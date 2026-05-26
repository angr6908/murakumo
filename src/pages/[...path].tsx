import { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'

import DrivePage from '../components/DrivePage'
import { getServerSidePublicConfigProps, type PublicRuntimeConfig } from '../utils/publicRuntimeConfig'

export default function Folders({ publicConfig }: { publicConfig: PublicRuntimeConfig }) {
  const { query } = useRouter()

  return (
    <DrivePage
      publicConfig={publicConfig}
      query={query}
      navClassName="mb-4 flex items-center justify-between space-x-3 px-4 sm:px-0 sm:pl-1"
    />
  )
}

export const getServerSideProps: GetServerSideProps = async () => getServerSidePublicConfigProps()
