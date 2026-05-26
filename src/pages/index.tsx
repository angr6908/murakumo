import { GetServerSideProps } from 'next'

import DrivePage from '../components/DrivePage'
import { getServerSidePublicConfigProps, type PublicRuntimeConfig } from '../utils/publicRuntimeConfig'

export default function Home({ publicConfig }: { publicConfig: PublicRuntimeConfig }) {
  return <DrivePage publicConfig={publicConfig} />
}

export const getServerSideProps: GetServerSideProps = async () => getServerSidePublicConfigProps()
