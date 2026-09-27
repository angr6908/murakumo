import type { FC } from 'react'
import type { OdFileObject } from '../../types'
import { formatModifiedDateTime, humanFileSize } from '../../utils/fileDetails'
import { getFileIcon } from '../../utils/getFileIcon'

import { DownloadFooter, PreviewContainer } from './Containers'

const labelClass = 'font-medium text-muted-foreground text-xs'

const DefaultPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const Icon = getFileIcon(file.name, { video: Boolean(file.video) })
  const details = [
    ['Last modified', formatModifiedDateTime(file.lastModifiedDateTime)],
    ['File size', humanFileSize(file.size)],
    ['MIME type', file.file?.mimeType ?? 'Unavailable'],
  ]
  const hashes = [
    ['Quick XOR', file.file.hashes?.quickXorHash],
    ['SHA1', file.file.hashes?.sha1Hash],
    ['SHA256', file.file.hashes?.sha256Hash],
  ]

  return (
    <div>
      <PreviewContainer>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8 md:p-2">
          <div className="well flex flex-col items-center gap-4 px-6 py-14 text-center md:w-44">
            <Icon className="size-8 text-muted-foreground" />
            <div className="line-clamp-3 break-all font-medium text-control">{file.name}</div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <dl className="grid gap-4 sm:grid-cols-3">
              {details.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1">
                  <dt className={labelClass}>{label}</dt>
                  <dd className="text-sm tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-col gap-1.5">
              <div className={labelClass}>{'Hashes'}</div>
              <dl className="well scroll-thin overflow-x-auto text-xs">
                {hashes.map(([label, value], i) => (
                  <div
                    key={label}
                    className={`flex gap-3 px-3 py-2 ${i > 0 ? 'shadow-[inset_0_1px_0_0_var(--color-border)]' : ''}`}
                  >
                    <dt className="w-20 shrink-0 font-medium text-muted-foreground">{label}</dt>
                    <dd className="whitespace-nowrap font-mono">{value ?? 'Unavailable'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </PreviewContainer>
      <DownloadFooter />
    </div>
  )
}

export default DefaultPreview
