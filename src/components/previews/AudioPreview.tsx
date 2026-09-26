import { selectPlayback, usePlayer } from '@videojs/react'
import { Audio, AudioPlayer, AudioSkin } from '@videojs/react/audio'
import Image from 'next/image'
import { type FC, useState } from 'react'

import type { OdFileObject } from '../../types'
import { formatModifiedDateTime, humanFileSize } from '../../utils/fileDetails'
import { FontAwesomeIcon } from '../../utils/fontawesome'
import { getExtension, stripExtension } from '../../utils/getFileIcon'
import { directFileUrl, thumbnailUrl } from '../../utils/odUrls'
import { useCurrentPathToken } from '../../utils/useCurrentPathToken'
import DownloadButtonGroup from '../DownloadBtnGtoup'
import { LoadingIcon } from '../Loading'

import '@videojs/react/audio/skin.css'

const Cover: FC<{ src: string; alt: string }> = ({ src, alt }) => {
  const playback = usePlayer(selectPlayback)
  const [broken, setBroken] = useState(false)

  return (
    <div className="relative size-48 shrink-0 overflow-hidden rounded-2xl bg-gray-200 shadow-lg sm:size-56 dark:bg-gray-700">
      {broken ? (
        <div className="flex size-full items-center justify-center text-gray-400 dark:text-gray-500">
          <FontAwesomeIcon icon="music" size="3x" />
        </div>
      ) : (
        <Image className="object-cover" src={src} alt={alt} fill sizes="224px" onError={() => setBroken(true)} />
      )}
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
        <Cover key={thumbnail} src={thumbnail} alt={file.name} />
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
