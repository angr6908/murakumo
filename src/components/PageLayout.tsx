import { CheckIcon } from '@videojs/react/icons'
import { CircleAlert } from 'lucide-react'
import Head from 'next/head'
import type { ReactNode } from 'react'
import { resolveValue, Toaster } from 'react-hot-toast'

import type { BrandIcons } from '../utils/brandIcons'
import { getPublicRuntimeConfig } from '../utils/publicRuntimeConfig'
import Footer from './Footer'
import { Spinner } from './Loading'
import Navbar from './Navbar'

const toastIcons = {
  success: <CheckIcon className="size-4.5 shrink-0" />,
  error: <CircleAlert className="shrink-0 text-danger" />,
  loading: <Spinner />,
} as const

export default function PageLayout({
  title,
  brandIcons,
  children,
}: {
  title?: string
  brandIcons?: BrandIcons
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Head>
        <title>{title ?? getPublicRuntimeConfig().title}</title>
      </Head>

      <Toaster containerStyle={{ top: 'calc(var(--spacing) * 18)' }}>
        {t => (
          <div className="toast surface-popover" data-visible={t.visible || undefined} {...t.ariaProps}>
            {t.icon ?? (t.type in toastIcons ? toastIcons[t.type as keyof typeof toastIcons] : null)}
            <div className="min-w-0">{resolveValue(t.message, t)}</div>
          </div>
        )}
      </Toaster>

      <Navbar brandIcons={brandIcons} />
      <main className="flex w-full flex-1 flex-col">{children}</main>

      <Footer />
    </div>
  )
}
