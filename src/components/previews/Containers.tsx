import type React from 'react'
import DownloadButtonGroup from '../DownloadBtnGtoup'

export function PreviewContainer({ children }: { children: React.ReactNode }) {
  return <div className="surface p-3 sm:rounded-popup sm:p-4">{children}</div>
}

export function DownloadBtnContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none sticky bottom-3 z-10 mt-3 flex justify-center px-2 *:pointer-events-auto">
      {children}
    </div>
  )
}

/** The standard sticky footer every preview ends with; extra buttons render inside the button group. */
export function DownloadFooter({ children }: { children?: React.ReactNode }) {
  return (
    <DownloadBtnContainer>
      <DownloadButtonGroup>{children}</DownloadButtonGroup>
    </DownloadBtnContainer>
  )
}
