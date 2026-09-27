import { selectPlayback, usePlayer } from '@videojs/react'
import { Audio, AudioPlayer, AudioSkin } from '@videojs/react/audio'
import { type FC, useState } from 'react'

import type { OdFileObject } from '../../types'
import { formatModifiedDateTime, humanFileSize } from '../../utils/fileDetails'
import { getExtension, stripExtension } from '../../utils/getFileIcon'
import { directFileUrl, thumbnailUrl } from '../../utils/odUrls'
import { useCurrentPathToken } from '../../utils/useCurrentPathToken'
import DownloadButtonGroup from '../DownloadBtnGtoup'
import { LoadingIcon } from '../Loading'

import '@videojs/react/audio/skin.css'

const Cover: FC<{ src: string; alt: string; wide: boolean }> = ({ src, alt, wide }) => {
  const playback = usePlayer(selectPlayback)
  const [missing, setMissing] = useState(false)
  if (missing) return null

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl bg-gray-200 shadow-lg dark:bg-gray-700 ${
        wide ? 'aspect-video w-full max-w-80 sm:h-56 sm:w-auto sm:max-w-none' : 'size-48 sm:size-56'
      }`}
    >
      <img className="size-full object-cover" src={src} alt={alt} decoding="async" onError={() => setMissing(true)} />
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
  const details = [
    getExtension(file.name).toUpperCase(),
    humanFileSize(file.size),
    formatModifiedDateTime(file.lastModifiedDateTime),
  ]

  return (
    <AudioPlayer title={file.name}>
      <div className="flex flex-col items-center gap-6 px-4 pt-2 pb-6 sm:flex-row sm:gap-8 sm:px-0">
        <Cover key={thumbnail} src={thumbnail} alt={file.name} wide={getExtension(file.name) === 'opus'} />
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
