import type { ReactNode } from 'react'

import Head from 'next/head'

import Footer from './Footer'
import Navbar from './Navbar'

export default function PageLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-800">
      <Head>
        <title>{title}</title>
      </Head>

      <main className="flex w-full flex-1 flex-col bg-gray-50 dark:bg-gray-800">
        <Navbar />
        {children}
      </main>

      <Footer />
    </div>
  )
}
