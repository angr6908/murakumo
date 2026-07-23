import axios from 'axios'
import dynamic from 'next/dynamic'
import { type FC, useEffect } from 'react'
import { useAsync } from 'react-async-hook'
import type { OdFileObject } from '../../types'

import { getBaseUrl } from '../../utils/getBaseUrl'
import { getExtension, stripExtension } from '../../utils/getFileIcon'
import { directFileUrl, rawFileUrl, thumbnailUrl } from '../../utils/odUrls'
import { useCurrentPathToken } from '../../utils/useCurrentPathToken'
import DownloadButtonGroup, { DownloadButton } from '../DownloadBtnGtoup'
import FourOhFour from '../FourOhFour'
import Loading from '../Loading'
import { DownloadBtnContainer, PreviewContainer } from './Containers'

import 'plyr-react/plyr.css'

const Plyr = dynamic(() => import('plyr-react').then(mod => mod.Plyr), {
  ssr: false,
})

const VideoPlayer: FC<{
  videoName: string
  videoUrl: string
  width?: number
  height?: number
  thumbnail: string
  subtitle: string
  isFlv: boolean
  mpegts: any
}> = ({ videoName, videoUrl, width, height, thumbnail, subtitle, isFlv, mpegts }) => {
  useEffect(() => {
    axios
      .get(subtitle, { responseType: 'blob' })
      .then(resp => {
        const track = document.querySelector('track')
        track?.setAttribute('src', URL.createObjectURL(resp.data))
      })
      .catch(() => {})

    if (isFlv) {
      const video = document.getElementById('plyr')
      const flv = mpegts.createPlayer({ url: videoUrl, type: 'flv' })
      flv.attachMediaElement(video)
      flv.load()
    }
  }, [videoUrl, isFlv, mpegts, subtitle])

  const plyrSource: any = {
    type: 'video',
    title: videoName,
    poster: thumbnail,
    tracks: [{ kind: 'captions', label: videoName, src: '', default: true }],
    sources: isFlv ? [] : [{ src: videoUrl }],
  }
  const plyrOptions = {
    ratio: `${width ?? 16}:${height ?? 9}`,
    fullscreen: { iosNative: true },
  }

  return <Plyr id="plyr" source={plyrSource} options={plyrOptions} />
}

const VideoPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath, hashedToken } = useCurrentPathToken()

  const thumbnail = thumbnailUrl(asPath, 'large', hashedToken)
  const subtitle = rawFileUrl(`${stripExtension(asPath)}.vtt`, hashedToken)
  const videoUrl = rawFileUrl(asPath, hashedToken)
  const playbackUrl = directFileUrl(file, asPath, hashedToken)

  const isFlv = getExtension(file.name) === 'flv'
  const {
    loading,
    error,
    result: mpegts,
  } = useAsync(async () => {
    if (isFlv) {
      return (await import('mpegts.js')).default
    }
  }, [isFlv])

  return (
    <>
      <PreviewContainer>
        {error ? (
          <FourOhFour errorMsg={error.message} />
        ) : loading && isFlv ? (
          <Loading loadingText={'Loading FLV extension...'} />
        ) : (
          <VideoPlayer
            videoName={file.name}
            videoUrl={playbackUrl}
            width={file.video?.width}
            height={file.video?.height}
            thumbnail={thumbnail}
            subtitle={subtitle}
            isFlv={isFlv}
            mpegts={mpegts}
          />
        )}
      </PreviewContainer>

      <DownloadBtnContainer>
        <DownloadButtonGroup>
          {[
            { text: 'IINA', img: '/players/iina.png', url: `iina://weblink?url=${getBaseUrl()}${videoUrl}` },
            { text: 'VLC', img: '/players/vlc.png', url: `vlc://${getBaseUrl()}${videoUrl}` },
            { text: 'PotPlayer', img: '/players/potplayer.png', url: `potplayer://${getBaseUrl()}${videoUrl}` },
            {
              text: 'nPlayer',
              img: '/players/nplayer.png',
              url: `nplayer-http://${window?.location.hostname ?? ''}${videoUrl}`,
            },
          ].map(({ text, img, url }) => (
            <DownloadButton key={text} onClickCallback={() => window.open(url)} btnText={text} btnImage={img} />
          ))}
        </DownloadButtonGroup>
      </DownloadBtnContainer>
    </>
  )
}

export default VideoPreview
