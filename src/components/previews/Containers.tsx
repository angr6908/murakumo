import type React from 'react'
import type { OdFileObject } from '../../types'
import { formatFileSummary } from '../../utils/fileDetails'
import { stripExtension } from '../../utils/fileType'
import DownloadButtonGroup from '../DownloadBtnGtoup'

export function PreviewContainer({ children }: { children: React.ReactNode }) {
  return <div className="surface p-3 sm:rounded-popup sm:p-4">{children}</div>
}

/** The standard sticky footer every preview ends with; extra buttons render inside the button group. */
export function DownloadFooter({ children }: { children?: React.ReactNode }) {
  return (
    <div className="pointer-events-none sticky bottom-3 z-10 mt-3 flex justify-center px-2 *:pointer-events-auto">
      <DownloadButtonGroup>{children}</DownloadButtonGroup>
    </div>
  )
}

export function MediaHeading({ file, detail, className }: { file: OdFileObject; detail?: string; className: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className={`break-words font-semibold ${className}`}>{stripExtension(file.name)}</h1>
      <p className="text-control text-muted-foreground tabular-nums">{formatFileSummary(file, detail)}</p>
    </div>
  )
}
