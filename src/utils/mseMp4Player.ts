import { initSegment, type Mp4Sample, mediaSegment } from './fmp4'
import { chunksFrom, type Mp4Probe, type Mp4Track, parseMoov } from './mp4'

type AudioStore = { samples: Mp4Sample[]; appended: number }
type Session = { aborted: boolean; target: number; start: number; end: number; stream?: RangeStream; wake?: () => void }
type AudioTrackEntry = { id: string; kind: string; label: string; language: string; enabled: boolean }

const forwardBuffer = 30
const backBuffer = 20
const firstFlushFrames = 8
const flushFrames = 30
const switchLead = 0.3
const maxSkip = 1 << 20

type Source = { url: string; refresh: () => Promise<boolean> }

const expiredStatus = new Set([401, 403, 404, 410])

class RangeStream {
  readonly #source: Source
  readonly #controller = new AbortController()
  #reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  #chunks: Uint8Array[] = []
  #head = 0
  #queued = 0
  #retries = 0
  position: number

  constructor(source: Source, position: number) {
    this.#source = source
    this.position = position
  }

  async #open() {
    const request = () =>
      fetch(this.#source.url, {
        headers: { Range: `bytes=${this.position + this.#queued}-` },
        signal: this.#controller.signal,
      })
    let resp = await request()
    if (expiredStatus.has(resp.status) && (await this.#source.refresh())) {
      await resp.body?.cancel()
      resp = await request()
    }
    if (resp.status !== 206 || !resp.body) {
      await resp.body?.cancel()
      throw new Error(`Range request failed: ${resp.status}`)
    }
    return resp.body.getReader()
  }

  async #pull() {
    try {
      this.#reader ??= await this.#open()
      const { done, value } = await this.#reader.read()
      if (done) return false
      this.#chunks.push(value)
      this.#queued += value.length
      this.#retries = 0
      return true
    } catch (error) {
      if (this.#controller.signal.aborted || this.#retries++ >= 3) throw error
      this.#reader = undefined
      await new Promise(resolve => setTimeout(resolve, 500 * this.#retries))
      return true
    }
  }

  async #ensure(length: number) {
    while (this.#queued < length) {
      if (!(await this.#pull())) throw new Error('Unexpected end of stream')
    }
  }

  #drop(length: number) {
    this.#queued -= length
    this.position += length
    let remaining = length
    while (remaining > 0) {
      const available = this.#chunks[0].length - this.#head
      if (remaining < available) {
        this.#head += remaining
        return
      }
      remaining -= available
      this.#chunks.shift()
      this.#head = 0
    }
  }

  async read(length: number) {
    await this.#ensure(length)
    const out = new Uint8Array(length)
    let copied = 0
    let head = this.#head
    for (let index = 0; copied < length; index++) {
      const chunk = this.#chunks[index]
      const take = Math.min(length - copied, chunk.length - head)
      out.set(chunk.subarray(head, head + take), copied)
      copied += take
      head = 0
    }
    this.#drop(length)
    return out
  }

  async skipTo(offset: number) {
    const distance = offset - this.position
    if (distance < 0) throw new Error('Cannot skip backwards')
    if (distance > this.#queued + maxSkip) {
      await this.#reader?.cancel().catch(() => {})
      this.#reader = undefined
      this.#chunks = []
      this.#head = 0
      this.#queued = 0
      this.position = offset
      return
    }
    await this.#ensure(distance)
    this.#drop(distance)
  }

  cancel() {
    this.#controller.abort()
  }
}

class BufferQueue {
  readonly sourceBuffer: SourceBuffer
  #tail: Promise<void> = Promise.resolve()

  constructor(sourceBuffer: SourceBuffer) {
    this.sourceBuffer = sourceBuffer
  }

  #run(operation: () => void, waitForUpdate = true) {
    const sourceBuffer = this.sourceBuffer
    const next = this.#tail.then(
      () =>
        new Promise<void>((resolve, reject) => {
          if (!waitForUpdate) {
            operation()
            resolve()
            return
          }
          const cleanup = () => {
            sourceBuffer.removeEventListener('updateend', done)
            sourceBuffer.removeEventListener('error', fail)
          }
          const done = () => {
            cleanup()
            resolve()
          }
          const fail = () => {
            cleanup()
            reject(new Error('SourceBuffer error'))
          }
          sourceBuffer.addEventListener('updateend', done)
          sourceBuffer.addEventListener('error', fail)
          try {
            operation()
          } catch (error) {
            cleanup()
            reject(error)
          }
        }),
    )
    this.#tail = next.catch(() => {})
    return next
  }

  append(data: Uint8Array<ArrayBuffer>) {
    return this.#run(() => this.sourceBuffer.appendBuffer(data))
  }

  remove(start: number, end: number) {
    return end - start > 0.01 ? this.#run(() => this.sourceBuffer.remove(start, end)) : Promise.resolve()
  }

  setOffset(offset: number) {
    return this.#run(() => {
      this.sourceBuffer.timestampOffset = offset
    }, false)
  }

  changeType(type: string) {
    return this.#run(() => this.sourceBuffer.changeType(type), false)
  }

  idle() {
    return this.#tail
  }
}

class MseAudioTrackList extends EventTarget {
  [index: number]: AudioTrackEntry
  readonly length: number

  constructor(entries: AudioTrackEntry[]) {
    super()
    entries.forEach((entry, index) => {
      this[index] = entry
    })
    this.length = entries.length
  }

  *[Symbol.iterator]() {
    for (let index = 0; index < this.length; index++) yield this[index]
  }

  getTrackById(id: string) {
    return [...this].find(track => track.id === id) ?? null
  }
}

const once = (target: EventTarget, type: string) =>
  new Promise<void>(resolve => target.addEventListener(type, () => resolve(), { once: true }))

const bufferedRange = (sourceBuffer: SourceBuffer, time: number) => {
  const { buffered } = sourceBuffer
  for (let index = 0; index < buffered.length; index++) {
    if (buffered.start(index) <= time + 0.1 && buffered.end(index) >= time) {
      return { start: buffered.start(index), end: buffered.end(index) }
    }
  }
  return undefined
}

export async function playMp4WithMse(
  video: HTMLVideoElement,
  url: string,
  probe: Mp4Probe,
  options: {
    startTime: number
    resume: boolean
    refreshUrl?: string
    signal: AbortSignal
    onError: (error: unknown) => void
  },
) {
  const source: Source = {
    url,
    async refresh() {
      if (!options.refreshUrl) return false
      const resp = await fetch(options.refreshUrl, { headers: { Range: 'bytes=0-0' } }).catch(() => undefined)
      await resp?.body?.cancel()
      if (!resp?.ok || !resp.url || resp.url === source.url) return false
      source.url = resp.url
      return true
    },
  }
  const initial = new RangeStream(source, probe.moov.offset)
  options.signal.addEventListener('abort', () => initial.cancel(), { once: true })
  let reusable: RangeStream | undefined = initial
  const supported = (kind: string, track: Mp4Track) =>
    Boolean(track.codec && track.orderedChunks && MediaSource.isTypeSupported(`${kind}/mp4; codecs="${track.codec}"`))

  let movie: ReturnType<typeof parseMoov>
  try {
    movie = parseMoov((await initial.read(probe.moov.size)).buffer)
  } catch (error) {
    initial.cancel()
    throw error
  }
  options.signal.throwIfAborted()
  const videoTrack = movie.tracks.find(track => track.type === 'vide' && supported('video', track))
  const audioTracks = movie.tracks.filter(track => track.type === 'soun' && supported('audio', track))
  if (movie.fragmented || !videoTrack || audioTracks.length === 0) {
    initial.cancel()
    throw new Error('MP4 is not playable through MediaSource')
  }

  const tracks = [videoTrack, ...audioTracks]
  const shift = Math.max(0, -videoTrack.presentationOffset)
  const offsetOf = (track: Mp4Track) => track.presentationOffset + shift
  const toSeconds = (track: Mp4Track, time: number) => time / track.timescale + offsetOf(track)
  const toMedia = (track: Mp4Track, seconds: number) => Math.max(0, (seconds - offsetOf(track)) * track.timescale)
  const stores = new Map<Mp4Track, AudioStore>(audioTracks.map(track => [track, { samples: [], appended: 0 }]))
  let active = audioTracks[0]
  let sequence = 1
  let destroyed = false
  let session: Session | undefined
  let playhead = 0
  let audioLock: Promise<void> = Promise.resolve()
  let markReady = () => {}
  const ready = new Promise<void>(resolve => {
    markReady = resolve
  })

  const withAudio = (task: () => Promise<void> | void) => {
    const run = audioLock.then(task)
    audioLock = run.catch(() => {})
    return run
  }

  const fail = (error: unknown) => {
    if (!destroyed) options.onError(error)
  }

  const switchAudio = (next: Mp4Track) =>
    withAudio(async () => {
      await ready
      if (next === active || destroyed) return
      const previous = active
      active = next
      list.dispatchEvent(new Event('change'))
      const from = video.paused ? video.currentTime : video.currentTime + switchLead
      await audioQueue.remove(from, mediaSource.duration)
      if (next.codec !== previous.codec) await audioQueue.changeType(`audio/mp4; codecs="${next.codec}"`)
      await audioQueue.setOffset(offsetOf(next))
      await audioQueue.append(initSegment(next))
      const store = stores.get(next) as AudioStore
      const fromMedia = toMedia(next, from)
      const index = store.samples.findIndex(sample => sample.dts + sample.duration > fromMedia)
      const replay = index === -1 ? [] : store.samples.slice(index)
      store.appended = store.samples.length
      if (replay.length > 0) await appendWithEviction(audioQueue, mediaSegment(next.id, sequence++, replay))
    }).catch(fail)

  const list = new MseAudioTrackList(
    audioTracks.map((track, index) => ({
      id: String(track.id),
      kind: index === 0 ? 'main' : 'alternative',
      label: track.name,
      language: track.language,
      get enabled() {
        return active === track
      },
      set enabled(value: boolean) {
        if (value) void switchAudio(track)
      },
    })),
  )

  const mediaSource = new MediaSource()
  const objectUrl = URL.createObjectURL(mediaSource)
  const { startTime, resume } = options
  Object.defineProperty(video, 'audioTracks', { configurable: true, get: () => list })
  video.src = objectUrl
  await once(mediaSource, 'sourceopen')
  mediaSource.duration = movie.duration / movie.timescale + shift
  const videoQueue = new BufferQueue(mediaSource.addSourceBuffer(`video/mp4; codecs="${videoTrack.codec}"`))
  const audioQueue = new BufferQueue(mediaSource.addSourceBuffer(`audio/mp4; codecs="${active.codec}"`))
  void videoQueue.setOffset(offsetOf(videoTrack))
  void videoQueue.append(initSegment(videoTrack)).catch(fail)
  void audioQueue.setOffset(offsetOf(active))
  void audioQueue.append(initSegment(active)).catch(fail)
  markReady()

  const trimBuffers = async (keep: number) => {
    if (keep <= 0) return
    await Promise.all([videoQueue.remove(0, keep), audioQueue.remove(0, keep)])
  }

  const appendWithEviction = async (queue: BufferQueue, data: Uint8Array<ArrayBuffer>) => {
    try {
      await queue.append(data)
    } catch (error) {
      if ((error as DOMException)?.name !== 'QuotaExceededError') throw error
      await trimBuffers(video.currentTime - 5)
      await queue.append(data)
    }
  }

  const flush = async (current: Session, samples: Mp4Sample[]) => {
    if (current.aborted) return
    if (samples.length > 0) {
      await appendWithEviction(videoQueue, mediaSegment(videoTrack.id, sequence++, samples))
      const last = samples[samples.length - 1]
      current.end = toSeconds(videoTrack, last.dts + last.duration)
    }
    await withAudio(async () => {
      if (current.aborted) return
      const store = stores.get(active) as AudioStore
      const next = store.samples.slice(store.appended)
      store.appended = store.samples.length
      if (next.length > 0) await appendWithEviction(audioQueue, mediaSegment(active.id, sequence++, next))
    })
  }

  const evict = async () => {
    const keep = video.currentTime - backBuffer
    const limit = video.currentTime + forwardBuffer + 10
    const range = videoQueue.sourceBuffer.buffered
    if (keep > 0 && range.length > 0 && range.start(0) < keep - 5) await trimBuffers(keep)
    if (range.length > 0 && range.end(range.length - 1) > limit + 5) {
      await Promise.all([
        videoQueue.remove(limit, mediaSource.duration),
        audioQueue.remove(limit, mediaSource.duration),
      ])
    }
    await withAudio(() => {
      for (const [track, store] of stores) {
        const cut = store.samples.findIndex(sample => toSeconds(track, sample.dts + sample.duration) >= keep)
        const count = cut === -1 ? store.samples.length : cut
        if (count > 0) {
          store.samples.splice(0, count)
          store.appended = Math.max(0, store.appended - count)
        }
      }
    })
  }

  const ahead = () => {
    const range = bufferedRange(videoQueue.sourceBuffer, video.currentTime)
    return range ? range.end - video.currentTime : 0
  }

  const backpressure = async (current: Session) => {
    await evict()
    while (!current.aborted && ahead() > forwardBuffer) {
      await new Promise<void>(resolve => {
        const wake = () => {
          video.removeEventListener('timeupdate', wake)
          video.removeEventListener('seeking', wake)
          resolve()
        }
        current.wake = wake
        video.addEventListener('timeupdate', wake)
        video.addEventListener('seeking', wake)
      })
    }
  }

  const pump = async (current: Session) => {
    const videoFirst = videoTrack.syncSampleAtOrBefore(videoTrack.sampleAtTime(toMedia(videoTrack, current.target)))
    current.start = toSeconds(videoTrack, videoTrack.sampleDts(videoFirst))
    current.end = current.start
    const firstSamples = new Map<Mp4Track, number>([
      [videoTrack, videoFirst],
      ...audioTracks.map(track => [track, track.sampleAtTime(toMedia(track, current.start))] as const),
    ])
    const startOffset = Math.min(
      ...tracks.map(track => track.chunkOffset(track.sampleChunk(firstSamples.get(track) as number))),
    )
    await withAudio(() => {
      for (const store of stores.values()) {
        store.samples = []
        store.appended = 0
      }
    })
    const stream = reusable && reusable.position <= startOffset ? reusable : new RangeStream(source, startOffset)
    if (stream !== reusable) reusable?.cancel()
    reusable = undefined
    current.stream = stream
    if (current.aborted) {
      stream.cancel()
      return
    }

    let pending: Mp4Sample[] = []
    let flushed = false
    for (const { track, chunk, offset } of chunksFrom(tracks, startOffset)) {
      const first = track.chunkFirstSample(chunk)
      const count = track.chunkSampleCount(chunk)
      const min = firstSamples.get(track) as number
      if (first + count <= min) continue
      let position = offset
      for (let sample = first; sample < first + count; sample++) {
        const size = track.sampleSize(sample)
        if (sample >= min) {
          await stream.skipTo(position)
          const data = await stream.read(size)
          if (current.aborted) return
          const entry = {
            dts: track.sampleDts(sample),
            duration: track.sampleDuration(sample),
            cts: track.sampleCtsOffset(sample),
            sync: track.isSync(sample),
            data,
          }
          if (track === videoTrack) pending.push(entry)
          else stores.get(track)?.samples.push(entry)
        }
        position += size
      }
      if (pending.length >= (flushed ? flushFrames : firstFlushFrames)) {
        await flush(current, pending)
        pending = []
        flushed = true
        await backpressure(current)
        if (current.aborted) return
      }
    }
    await flush(current, pending)
    await Promise.all([videoQueue.idle(), audioQueue.idle()])
    if (!current.aborted && mediaSource.readyState === 'open') mediaSource.endOfStream()
  }

  const startSession = (time: number) => {
    if (session) {
      session.aborted = true
      session.stream?.cancel()
      session.wake?.()
    }
    const current: Session = { aborted: false, target: time, start: time, end: time }
    session = current
    pump(current).catch(error => {
      if (!current.aborted) fail(error)
    })
  }

  const keyframeBefore = (time: number) => {
    const sample = videoTrack.syncSampleAtOrBefore(videoTrack.sampleAtTime(toMedia(videoTrack, time)))
    return toSeconds(videoTrack, videoTrack.sampleDts(sample) + videoTrack.sampleCtsOffset(sample))
  }

  const onSeeking = () => {
    const time = video.currentTime
    if (session && !session.aborted && time >= session.start - 0.01 && time <= Math.max(session.end, session.target) + 1) {
      return
    }
    const range = bufferedRange(videoQueue.sourceBuffer, time)
    if (range && session && !session.aborted && Math.abs(range.end - session.end) < 1) return
    const keyframe = keyframeBefore(time)
    if (!range && time - keyframe > 0.25 && (time < playhead || keyframe > playhead + 0.5)) {
      startSession(keyframe)
      video.currentTime = keyframe
      return
    }
    startSession(time)
  }

  const onTimeUpdate = () => {
    if (!video.seeking) playhead = video.currentTime
  }

  const onError = () => fail(video.error)

  video.addEventListener('seeking', onSeeking)
  video.addEventListener('timeupdate', onTimeUpdate)
  video.addEventListener('error', onError)
  startSession(startTime)
  if (startTime > 0) video.currentTime = startTime
  if (resume) video.play().catch(() => {})

  return () => {
    destroyed = true
    if (session) {
      session.aborted = true
      session.stream?.cancel()
      session.wake?.()
    }
    reusable?.cancel()
    video.removeEventListener('seeking', onSeeking)
    video.removeEventListener('timeupdate', onTimeUpdate)
    video.removeEventListener('error', onError)
    Reflect.deleteProperty(video, 'audioTracks')
    if (video.src === objectUrl) {
      video.removeAttribute('src')
      video.load()
    }
    URL.revokeObjectURL(objectUrl)
  }
}
