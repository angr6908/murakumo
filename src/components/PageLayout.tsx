import Head from 'next/head'
import type { ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'

import type { BrandIcons } from '../utils/brandIcons'
import Footer from './Footer'
import Navbar from './Navbar'

export default function PageLayout({
  title,
  brandIcons,
  children,
}: {
  title: string
  brandIcons?: BrandIcons
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-800">
      <Head>
        <title>{title}</title>
      </Head>

      <Toaster />

      <main className="flex w-full flex-1 flex-col bg-gray-50 dark:bg-gray-800">
        <Navbar brandIcons={brandIcons} />
        {children}
      </main>

      <Footer />
    </div>
  )
}
