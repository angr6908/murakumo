import Image from 'next/image'
import type { ReactNode } from 'react'

export default function OAuthCard({
  imageAlt,
  imageSrc,
  stepTitle,
  children,
}: {
  imageAlt: string
  imageSrc: string
  stepTitle: string
  children: ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-5xl p-4">
      <div className="rounded bg-white p-3 dark:bg-gray-900 dark:text-gray-100">
        <div className="mx-auto w-52">
          <Image src={imageSrc} width={912} height={912} alt={imageAlt} priority />
        </div>
        <h3 className="mb-4 text-center font-medium text-xl">Welcome to your new Murakumo 🎉</h3>
        <h3 className="mt-4 mb-2 font-medium text-lg">{stepTitle}</h3>
        {children}
      </div>
    </div>
  )
}
