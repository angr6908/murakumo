import { Video, VideoPlayer, VideoSkin } from '@videojs/react/video'
import { type FC, useCallback, useEffect, useRef, useState } from 'react'
import { useAsync } from 'react-async-hook'
import type { OdFileObject } from '../../types'

import { labelAudioTracks } from '../../utils/audioTrackNames'
import { formatModifiedDateTime, humanFileSize } from '../../utils/fileDetails'
import { getBaseUrl } from '../../utils/getBaseUrl'
import { getExtension, stripExtension } from '../../utils/getFileIcon'
import type { Mp4Probe } from '../../utils/mp4'
import { playMp4WithMse } from '../../utils/mseMp4Player'
import { directFileUrl, rawFileUrl, thumbnailUrl, tracksUrl } from '../../utils/odUrls'
import { useCurrentPathToken } from '../../utils/useCurrentPathToken'
import DownloadButtonGroup, { DownloadButton } from '../DownloadBtnGtoup'
import FourOhFour from '../FourOhFour'
import Loading from '../Loading'
import { PreviewContainer } from './Containers'

import '@videojs/react/video/skin.css'

const maxPlayerHeight = 'max(15rem, 100svh - 8rem)'
const probeTimeout = 2500
const mp4Extensions = new Set(['mp4', 'm4v', 'mov'])

const hasNativeAudioTracks = () => typeof HTMLMediaElement !== 'undefined' && 'audioTracks' in HTMLMediaElement.prototype
const hasMediaSource = () => typeof MediaSource !== 'undefined'

const VideoPlayerView: FC<{
  videoName: string
  videoUrl: string
  ratio: string
  thumbnail: string
  subtitle: string
  isFlv: boolean
  mpegts: any
  probeUrl?: string
  multiAudio: boolean
  refreshUrl: string
  onResize: (size: { width: number; height: number }) => void
}> = ({ videoName, videoUrl, ratio, thumbnail, subtitle, isFlv, mpegts, probeUrl, multiAudio, refreshUrl, onResize }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioLabelsRef = useRef<ReturnType<typeof labelAudioTracks>>(undefined)
  const wasWaitingRef = useRef(false)
  const [subtitleUrl, setSubtitleUrl] = useState<string>()
  const [probe, setProbe] = useState<{ url: string; value: Mp4Probe | null }>()
  const [mseFailedUrl, setMseFailedUrl] = useState<string>()

  const canUseMse = hasMediaSource() && !hasNativeAudioTracks()
  const hinted = Boolean(multiAudio && probeUrl && canUseMse && !isFlv)
  const probeResult = probe && probe.url === probeUrl ? probe.value : undefined
  const waiting = Boolean(probeUrl && canUseMse && !isFlv && !hinted && probeResult === undefined)
  const videoCodec = probeResult?.tracks.find(track => track.type === 'vide')?.codec
  const useMse = Boolean(
    canUseMse &&
      !isFlv &&
      mseFailedUrl !== videoUrl &&
      (hinted ||
        (probeResult?.moov &&
          !probeResult.fragmented &&
          probeResult.tracks.filter(track => track.type === 'soun').length > 1 &&
          (!videoCodec || MediaSource.isTypeSupported(`video/mp4; codecs="${videoCodec}"`)))),
  )

  const attachVideo = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video
    audioLabelsRef.current = video ? labelAudioTracks(video) : undefined
  }, [])

  useEffect(() => {
    const player = () => videoRef.current?.closest<HTMLElement>('.media-container')
    const ownsFocus = (element: Element | null) =>
      Boolean(
        element?.closest(
          'input, textarea, select, [contenteditable="true"], [role="menu"], [role="menuitem"], [role="menuitemradio"], [role="listbox"], [role="dialog"]',
        ),
      )
    const focusPlayer = () => {
      const container = player()
      const active = document.activeElement
      if (!container || active === container || ownsFocus(active) || active?.getAttribute('aria-expanded') === 'true') return
      container.focus({ preventScroll: true })
    }
    let pointer = false
    const onPointerDown = () => {
      pointer = true
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') pointer = false
    }
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element
      if (event.detail === 0 || ownsFocus(target) || target.closest('[aria-haspopup]')) return
      requestAnimationFrame(focusPlayer)
    }
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element
      if (pointer && target.matches('button') && player()?.contains(target)) requestAnimationFrame(focusPlayer)
    }
    focusPlayer()
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('click', onClick, true)
    document.addEventListener('focusin', onFocusIn, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('focusin', onFocusIn, true)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | undefined
    fetch(subtitle, { signal: controller.signal })
      .then(resp => (resp.ok ? resp.blob() : Promise.reject()))
      .then(blob => {
        objectUrl = URL.createObjectURL(blob)
        setSubtitleUrl(objectUrl)
      })
      .catch(() => {})
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setSubtitleUrl(undefined)
    }
  }, [subtitle])

  useEffect(() => {
    if (!isFlv || !mpegts || !videoRef.current) return
    const flv = mpegts.createPlayer({ url: videoUrl, type: 'flv' })
    flv.attachMediaElement(videoRef.current)
    flv.load()
    return () => flv.destroy()
  }, [videoUrl, isFlv, mpegts])

  useEffect(() => {
    if (!probeUrl || hinted) return
    const controller = new AbortController()
    let settled = false
    const settle = (value: Mp4Probe | null) => {
      if (settled) return
      settled = true
      setProbe({ url: probeUrl, value })
    }
    const timer = hasNativeAudioTracks() ? undefined : setTimeout(() => settle(null), probeTimeout)
    fetch(probeUrl, { signal: controller.signal })
      .then(resp => (resp.ok ? resp.json() : null))
      .then(value => settle(value?.tracks ? value : null))
      .catch(() => settle(null))
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [probeUrl, hinted])

  useEffect(() => {
    if (probeResult?.tracks) audioLabelsRef.current?.setNames(probeResult.tracks)
  }, [probeResult])

  useEffect(() => {
    const video = videoRef.current
    if (waiting) {
      wasWaitingRef.current = true
      return
    }
    if (!wasWaitingRef.current || useMse || !video) return
    wasWaitingRef.current = false
    if (video.paused && video.readyState === HTMLMediaElement.HAVE_NOTHING) video.load()
  }, [waiting, useMse])

  useEffect(() => {
    const video = videoRef.current
    if (!useMse || !video) return
    const controller = new AbortController()
    let destroy: (() => void) | undefined
    const startTime = video.currentTime
    const resume = !video.paused
    if (video.currentSrc) {
      video.removeAttribute('src')
      video.load()
    }
    playMp4WithMse(video, videoUrl, probeResult?.moov ? probeResult : undefined, {
      startTime,
      resume,
      refreshUrl,
      cacheKey: probeUrl,
      signal: controller.signal,
      onError: () => setMseFailedUrl(videoUrl),
    })
      .then(dispose => {
        if (controller.signal.aborted) dispose()
        else destroy = dispose
      })
      .catch(() => {
        if (!controller.signal.aborted) setMseFailedUrl(videoUrl)
      })
    return () => {
      controller.abort()
      destroy?.()
    }
  }, [useMse, probeResult, videoUrl, refreshUrl, probeUrl])

  return (
    <VideoPlayer poster={thumbnail}>
      <VideoSkin
        className="w-full [--media-border-color:transparent] [--media-border-radius:0] sm:[&:not(:fullscreen)]:[clip-path:inset(0_round_0.75rem)]"
        style={{ aspectRatio: ratio }}
      >
        <Video
          ref={attachVideo}
          src={isFlv || useMse ? undefined : videoUrl}
          preload={waiting ? 'none' : undefined}
          playsInline
          onLoadedMetadata={({ currentTarget: { videoWidth, videoHeight } }) => {
            if (videoWidth && videoHeight) onResize({ width: videoWidth, height: videoHeight })
          }}
        >
          {subtitleUrl && <track kind="captions" label={videoName} src={subtitleUrl} default />}
        </Video>
      </VideoSkin>
    </VideoPlayer>
  )
}

const VideoPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath, hashedToken } = useCurrentPathToken()
  const [measured, setMeasured] = useState<{ url: string; width: number; height: number }>()

  const thumbnail = thumbnailUrl(asPath, 'large', hashedToken)
  const subtitle = rawFileUrl(`${stripExtension(asPath)}.vtt`, hashedToken)
  const videoUrl = rawFileUrl(asPath, hashedToken)
  const playbackUrl = directFileUrl(file, asPath, hashedToken)

  const isFlv = getExtension(file.name) === 'flv'
  const probeUrl = mp4Extensions.has(getExtension(file.name))
    ? tracksUrl(asPath, hashedToken, file.file?.hashes?.quickXorHash || String(file.size))
    : undefined
  const {
    loading,
    error,
    result: mpegts,
  } = useAsync(async () => {
    if (isFlv) {
      return (await import('mpegts.js')).default
    }
  }, [isFlv])

  const size =
    measured?.url === playbackUrl ? measured : { width: file.video?.width || 16, height: file.video?.height || 9 }
  const ratio = `${size.width} / ${size.height}`
  const columnWidth = size.height >= size.width ? `min(100%, calc(${maxPlayerHeight} * ${ratio}))` : undefined
  const details = [
    getExtension(file.name).toUpperCase(),
    file.video?.width && file.video?.height ? `${file.video.width}×${file.video.height}` : undefined,
    humanFileSize(file.size),
    formatModifiedDateTime(file.lastModifiedDateTime),
  ].filter(Boolean)

  const externalPlayers = [
    { text: 'IINA', img: '/players/iina.png', url: `iina://weblink?url=${getBaseUrl()}${videoUrl}` },
    { text: 'VLC', img: '/players/vlc.png', url: `vlc://${getBaseUrl()}${videoUrl}` },
    { text: 'PotPlayer', img: '/players/potplayer.png', url: `potplayer://${getBaseUrl()}${videoUrl}` },
    { text: 'nPlayer', img: '/players/nplayer.png', url: `nplayer-http://${window.location.hostname}${videoUrl}` },
  ]

  return (
    <div className="mx-auto w-full" style={{ width: columnWidth }}>
      {error ? (
        <PreviewContainer>
          <FourOhFour errorMsg={error.message} />
        </PreviewContainer>
      ) : loading && isFlv ? (
        <PreviewContainer>
          <Loading loadingText={'Loading FLV extension...'} />
        </PreviewContainer>
      ) : (
        <VideoPlayerView
          videoName={file.name}
          videoUrl={playbackUrl}
          ratio={ratio}
          thumbnail={thumbnail}
          subtitle={subtitle}
          isFlv={isFlv}
          mpegts={mpegts}
          probeUrl={probeUrl}
          multiAudio={file.name.includes('AAC×2')}
          refreshUrl={videoUrl}
          onResize={({ width, height }) => setMeasured({ url: playbackUrl, width, height })}
        />
      )}

      <div className="mt-4 space-y-4 px-4 sm:px-0">
        <div>
          <h1 className="break-words font-semibold text-gray-900 text-lg sm:text-xl dark:text-gray-100">
            {stripExtension(file.name)}
          </h1>
          <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">{details.join(' · ')}</p>
        </div>
        <DownloadButtonGroup className="justify-start">
          {externalPlayers.map(({ text, img, url }) => (
            <DownloadButton key={text} onClickCallback={() => window.open(url)} btnText={text} btnImage={img} />
          ))}
        </DownloadButtonGroup>
      </div>
    </div>
  )
}

export default VideoPreview
