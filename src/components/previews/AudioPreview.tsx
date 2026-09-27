import { selectPlayback, usePlayer } from '@videojs/react'
import { Audio, AudioPlayer, AudioSkin } from '@videojs/react/audio'
import { type CSSProperties, type FC, useState } from 'react'

import type { OdFileObject } from '../../types'
import { formatModifiedDateTime, humanFileSize } from '../../utils/fileDetails'
import { getExtension, stripExtension } from '../../utils/getFileIcon'
import { directFileUrl, thumbnailUrl } from '../../utils/odUrls'
import { useCurrentPathToken } from '../../utils/useCurrentPathToken'
import DownloadButtonGroup from '../DownloadBtnGtoup'
import { LoadingIcon } from '../Loading'

import '@videojs/react/audio/skin.css'

type Thumbnail = { width: number; height: number; url: string }

const Cover: FC<{ thumbnail?: Thumbnail; fallbackSrc: string; alt: string }> = ({ thumbnail, fallbackSrc, alt }) => {
  const playback = usePlayer(selectPlayback)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'missing'>('loading')
  if (status === 'missing') return null

  const sized = thumbnail
    ? ({ aspectRatio: `${thumbnail.width} / ${thumbnail.height}`, '--cover-ratio': thumbnail.height / thumbnail.width } as CSSProperties)
    : undefined

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl shadow-lg ${thumbnail || status === 'loaded' ? '' : 'hidden'}`}
    >
      <img
        className={
          thumbnail
            ? 'block h-[min(12rem,calc((100vw_-_2rem)*var(--cover-ratio)))] w-auto sm:h-[min(14rem,calc(24rem*var(--cover-ratio)))]'
            : 'block h-auto max-h-48 w-auto max-w-full sm:max-h-56 sm:max-w-96'
        }
        style={sized}
        src={thumbnail?.url ?? fallbackSrc}
        alt={alt}
        decoding="async"
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('missing')}
      />
      {playback?.waiting && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60">
          <LoadingIcon className="size-6 animate-spin" />
        </div>
      )}
    </div>
  )
}

const AudioPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath, hashedToken } = useCurrentPathToken()
  const thumbnail = thumbnailUrl(asPath, 'large', hashedToken)
  const cover = file.thumbnails ? file.thumbnails[0]?.large : undefined
  const hasCover = !file.thumbnails || Boolean(cover)
  const details = [
    getExtension(file.name).toUpperCase(),
    humanFileSize(file.size),
    formatModifiedDateTime(file.lastModifiedDateTime),
  ]

  return (
    <AudioPlayer title={file.name}>
      <div className="flex flex-col items-center gap-6 px-4 pt-2 pb-6 sm:flex-row sm:gap-8 sm:px-0">
        {hasCover && <Cover key={thumbnail} thumbnail={cover} fallbackSrc={thumbnail} alt={file.name} />}
        <div className="flex w-full min-w-0 flex-col gap-5 text-center sm:text-left">
          <div>
            <h1 className="break-words font-semibold text-gray-900 text-xl sm:text-2xl dark:text-gray-100">
              {stripExtension(file.name)}
            </h1>
            <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">{details.join(' · ')}</p>
          </div>
          <AudioSkin className="w-full [--media-border-color:transparent] [color-scheme:light_dark]">
            <Audio src={directFileUrl(file, asPath, hashedToken)} preload="metadata" />
          </AudioSkin>
          <DownloadButtonGroup className="justify-center sm:justify-start" />
        </div>
      </div>
    </AudioPlayer>
  )
}

export default AudioPreview
