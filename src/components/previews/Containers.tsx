import type React from 'react'

export function PreviewContainer({ children }: { children: React.ReactNode }) {
  return <div className="rounded bg-white p-3 shadow-sm dark:bg-gray-900 dark:text-white">{children}</div>
}

export function DownloadBtnContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky right-0 bottom-0 left-0 z-10 rounded border-gray-900/10 border-t bg-white bg-opacity-80 p-2 shadow-sm backdrop-blur-md dark:border-gray-500/30 dark:bg-gray-900">
      {children}
    </div>
  )
}
