import { Hotkey } from '@videojs/react'
import { I18nProvider as PlayerI18n } from '@videojs/react/i18n'
import { Video, VideoPlayer, VideoSkin } from '@videojs/react/video'
import { type FC, useCallback, useEffect, useRef, useState } from 'react'
import { useAsync } from 'react-async-hook'
import { useI18n } from '../../i18n'
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
const chapterMagnet = 8
const mp4Extensions = new Set(['mp4', 'm4v', 'mov'])
const documentHotkeys = [
  { keys: 'Space', action: 'togglePaused' },
  { keys: 'k', action: 'togglePaused' },
  { keys: 'm', action: 'toggleMuted' },
  { keys: 'ArrowRight', action: 'seekStep' },
  { keys: 'ArrowLeft', action: 'seekStep' },
  { keys: 'l', action: 'seekStep' },
  { keys: 'j', action: 'seekStep' },
  { keys: 'ArrowUp', action: 'volumeStep' },
  { keys: 'ArrowDown', action: 'volumeStep' },
  { keys: '0-9', action: 'seekToPercent' },
  { keys: 'Home', action: 'seekToPercent', value: 0 },
  { keys: 'End', action: 'seekToPercent', value: 100 },
  { keys: 'f', action: 'toggleFullscreen' },
  { keys: 'c', action: 'toggleSubtitles' },
  { keys: 'i', action: 'togglePictureInPicture' },
] as const

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
  const { locale } = useI18n()
  const audioLabelsRef = useRef<ReturnType<typeof labelAudioTracks>>(undefined)
  const wasWaitingRef = useRef(false)
  const [subtitleUrl, setSubtitleUrl] = useState<string>()
  const [probe, setProbe] = useState<{ url: string; value: Mp4Probe | null }>()
  const [mseFailedUrl, setMseFailedUrl] = useState<string>()
  const [chapters, setChapters] = useState<{ key: string; url: string }>()

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
    const onClick = (event: MouseEvent) => {
      if (event.detail === 0) return
      requestAnimationFrame(() => {
        const active = document.activeElement
        if (!(active instanceof HTMLElement) || !active.matches('button, [role="slider"]')) return
        if (active.closest('[role="menu"], [role="dialog"], [aria-expanded="true"]')) return
        active.blur()
      })
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    const skin = video?.closest<HTMLElement>('.video-skin')
    if (!video || !skin) return
    const onPointer = (event: PointerEvent) => {
      const slider = event.target instanceof Element ? event.target.closest('.media-time-slider') : null
      const cues = Array.from(video.textTracks).find(track => track.kind === 'chapters')?.cues
      if (!slider || !cues?.length || !Number.isFinite(video.duration) || video.duration <= 0) return
      const rect = slider.getBoundingClientRect()
      const nearest = Array.from(cues, cue => rect.left + ((cue.startTime + 0.001) / video.duration) * rect.width).reduce(
        (best, x) => (Math.abs(x - event.clientX) < Math.abs(best - event.clientX) ? x : best),
      )
      if (Math.abs(nearest - event.clientX) <= chapterMagnet) Object.defineProperty(event, 'clientX', { value: nearest })
    }
    const types = ['pointerdown', 'pointermove', 'pointerup'] as const
    types.forEach(type => skin.addEventListener(type, onPointer, true))
    return () => types.forEach(type => skin.removeEventListener(type, onPointer, true))
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
    let chaptersUrl: string | undefined
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
      onChapters: vtt => {
        chaptersUrl = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }))
        setChapters({ key: videoUrl, url: chaptersUrl })
      },
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
      if (chaptersUrl) URL.revokeObjectURL(chaptersUrl)
      setChapters(undefined)
    }
  }, [useMse, probeResult, videoUrl, refreshUrl, probeUrl])

  return (
    <VideoPlayer poster={thumbnail}>
      <PlayerI18n locale={locale}>
        <VideoSkin
          className="w-full [--media-border-color:transparent] [--media-border-radius:0] sm:[&:not(:fullscreen)]:[clip-path:inset(0_round_var(--radius-popup))]"
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
            {chapters?.key === videoUrl && <track kind="chapters" src={chapters.url} default />}
          </Video>
          {documentHotkeys.map(hotkey => (
            <Hotkey
              key={hotkey.keys}
              keys={hotkey.keys}
              action={hotkey.action}
              value={'value' in hotkey ? hotkey.value : undefined}
              target="document"
            />
          ))}
        </VideoSkin>
      </PlayerI18n>
    </VideoPlayer>
  )
}

const VideoPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath, hashedToken } = useCurrentPathToken()
  const { t } = useI18n()
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
          <Loading loadingText={t('Loading FLV extension...')} />
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

      <div className="mt-4 flex flex-col gap-4 px-4 sm:px-1">
        <div className="flex flex-col gap-1">
          <h1 className="break-words font-semibold text-lg sm:text-xl">{stripExtension(file.name)}</h1>
          <p className="text-control text-muted-foreground tabular-nums">{details.join(' · ')}</p>
        </div>
        <DownloadButtonGroup className="justify-start gap-2">
          {externalPlayers.map(({ text, img, url }) => (
            <DownloadButton key={text} onClickCallback={() => window.open(url)} btnText={text} btnImage={img} />
          ))}
        </DownloadButtonGroup>
      </div>
    </div>
  )
}

export default VideoPreview
