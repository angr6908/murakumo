import type { GetServerSideProps } from 'next'

import DrivePage from '../components/DrivePage'
import { getServerSidePublicConfigProps, type PublicConfigProps } from '../utils/serverConfig'

export default function Home({ publicConfig, brandIcons }: PublicConfigProps) {
  return <DrivePage publicConfig={publicConfig} brandIcons={brandIcons} />
}

export const getServerSideProps: GetServerSideProps = async () => getServerSidePublicConfigProps()
