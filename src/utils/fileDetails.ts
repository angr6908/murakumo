import dayjs from 'dayjs'

import type { OdFileObject } from '../types'
import { getExtension } from './fileType'
import { getPublicRuntimeConfig } from './publicRuntimeConfig'

export const humanFileSize = (size: number) => {
  if (size < 1024) return `${size} B`

  const i = Math.floor(Math.log(size) / Math.log(1024))
  const num = size / 1024 ** i
  const round = Math.round(num)
  const formatted = round < 10 ? num.toFixed(2) : round < 100 ? num.toFixed(1) : round

  return `${formatted} ${'KMGTPEZY'[i - 1]}B`
}

export const formatModifiedDateTime = (lastModifiedDateTime: string) => {
  return dayjs(lastModifiedDateTime).format(getPublicRuntimeConfig().datetimeFormat)
}

export const formatFileSummary = (file: OdFileObject, ...extra: (string | undefined)[]) =>
  [
    getExtension(file.name).toUpperCase(),
    ...extra,
    humanFileSize(file.size),
    formatModifiedDateTime(file.lastModifiedDateTime),
  ]
    .filter(Boolean)
    .join(' · ')
