import { initSegment, type Mp4Sample, mediaSegment } from './fmp4'
import { chunksFrom, type Mp4Chapter, type Mp4Probe, type Mp4Track, parseMoov } from './mp4'

type StoredSample = Mp4Sample & { index: number }
type AudioStore = { samples: StoredSample[]; appended: number }
type Session = { aborted: boolean; target: number; start: number; end: number; stream?: RangeStream; wake?: () => void }
type AudioTrackEntry = { id: string; kind: string; label: string; language: string; enabled: boolean }

const forwardBuffer = 120
const backBuffer = 120
const snapAhead = 3
const indexCacheName = 'murakumo-mp4-index'
const indexCacheLimit = 10
const firstFlushFrames = 8
const flushFrames = 30
const switchLead = 0.3
const healthyAhead = 5
const maxSkip = 1 << 20
const minWindow = 4 << 20
const maxWindow = 32 << 20
const locateWindow = 16 << 20

type Source = { url: string; refresh: () => Promise<boolean> }

const expiredStatus = new Set([401, 403, 404, 410])

class RangeStream {
  readonly #source: Source
  readonly #controller = new AbortController()
  #reader: ReadableStreamDefaultReader<Uint8Array> | null | undefined
  #next: Promise<ReadableStreamDefaultReader<Uint8Array> | null> | undefined
  #nextStart: number
  #firstWindow: number
  #chunks: Uint8Array[] = []
  #head = 0
  #queued = 0
  #retries = 0
  #windowBytes = 0
  #windowLength = 0
  #pendingLength = 0
  windowSize = minWindow
  position: number

  constructor(source: Source, position: number, firstWindow = minWindow) {
    this.#source = source
    this.position = position
    this.#nextStart = position
    this.#firstWindow = firstWindow
  }

  async #request(start: number, length: number) {
    const request = () =>
      fetch(this.#source.url, {
        headers: { Range: `bytes=${start}-${start + length - 1}` },
        signal: this.#controller.signal,
      })
    let resp = await request()
    if (expiredStatus.has(resp.status) && (await this.#source.refresh())) {
      await resp.body?.cancel()
      resp = await request()
    }
    if (resp.status === 416) return null
    if (resp.status !== 206 || !resp.body) {
      await resp.body?.cancel()
      throw new Error(`Range request failed: ${resp.status}`)
    }
    return resp.body.getReader()
  }

  #schedule() {
    const length = this.#firstWindow || this.windowSize
    this.#firstWindow = 0
    const start = this.#nextStart
    this.#nextStart += length
    this.#pendingLength = length
    const next = this.#request(start, length)
    next.catch(() => {})
    return next
  }

  #discard() {
    void this.#reader?.cancel().catch(() => {})
    void this.#next?.then(reader => reader?.cancel()).catch(() => {})
    this.#reader = undefined
    this.#next = undefined
  }

  async #pull() {
    try {
      if (this.#reader === undefined) {
        this.#reader = await (this.#next ?? this.#schedule())
        this.#next = undefined
        this.#windowBytes = 0
        this.#windowLength = this.#pendingLength
      }
      if (this.#reader === null) return false
      const { done, value } = await this.#reader.read()
      if (done) {
        this.#reader = this.#windowBytes === 0 ? null : undefined
        return this.#windowBytes > 0
      }
      this.#windowBytes += value.length
      if (!this.#next && this.#windowBytes >= this.#windowLength / 2) this.#next = this.#schedule()
      this.#chunks.push(value)
      this.#queued += value.length
      this.#retries = 0
      return true
    } catch (error) {
      if (this.#controller.signal.aborted || this.#retries++ >= 3) throw error
      this.#discard()
      this.#nextStart = this.position + this.#queued
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
      this.#discard()
      this.#chunks = []
      this.#head = 0
      this.#queued = 0
      this.position = offset
      this.#nextStart = offset
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

async function readCachedIndex(key: string, size?: number) {
  try {
    const hit = await (await caches.open(indexCacheName)).match(key)
    const buffer = hit && (await hit.arrayBuffer())
    return buffer && (size === undefined || buffer.byteLength === size) ? buffer : undefined
  } catch {
    return undefined
  }
}

async function storeIndex(key: string, buffer: ArrayBuffer) {
  try {
    const cache = await caches.open(indexCacheName)
    await cache.put(key, new Response(buffer.slice(0)))
    const keys = await cache.keys()
    for (const old of keys.slice(0, Math.max(0, keys.length - indexCacheLimit))) await cache.delete(old)
  } catch {}
}

const stamp = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds * 1000))
  const pad = (value: number, width = 2) => String(value).padStart(width, '0')
  return `${pad(Math.floor(total / 3600000))}:${pad(Math.floor(total / 60000) % 60)}:${pad(Math.floor(total / 1000) % 60)}.${pad(total % 1000, 3)}`
}

function chaptersVtt(chapters: Mp4Chapter[], duration: number) {
  const sorted = [...chapters].sort((a, b) => a.start - b.start)
  const cues = sorted
    .map((chapter, index) => ({ ...chapter, end: sorted[index + 1]?.start ?? duration }))
    .filter(chapter => chapter.end > chapter.start)
    .map(chapter => `${stamp(chapter.start)} --> ${stamp(chapter.end)}\n${chapter.title.replace(/\s*\n\s*/g, ' ')}`)
  return cues.length > 0 ? `WEBVTT\n\n${cues.join('\n\n')}\n` : undefined
}

async function readChapterTrack(url: string, track: Mp4Track, signal: AbortSignal) {
  const chapters: Mp4Chapter[] = []
  const decoder = new TextDecoder()
  for (let chunk = 0; chunk < track.chunkCount; chunk++) {
    const first = track.chunkFirstSample(chunk)
    const count = track.chunkSampleCount(chunk)
    const sizes = Array.from({ length: count }, (_, index) => track.sampleSize(first + index))
    const start = track.chunkOffset(chunk)
    const total = sizes.reduce((sum, size) => sum + size, 0)
    const resp = await fetch(url, { headers: { Range: `bytes=${start}-${start + total - 1}` }, signal })
    if (resp.status !== 206) return chapters
    const bytes = new Uint8Array(await resp.arrayBuffer())
    let position = 0
    sizes.forEach((size, index) => {
      const length = size >= 2 ? (bytes[position] << 8) | bytes[position + 1] : 0
      chapters.push({
        start: track.sampleDts(first + index) / track.timescale + track.presentationOffset,
        title: decoder.decode(bytes.subarray(position + 2, position + 2 + Math.min(length, size - 2))),
      })
      position += size
    })
  }
  return chapters
}

async function locateIndex(stream: RangeStream) {
  for (let hops = 0; hops < 16; hops++) {
    const offset = stream.position
    const head = await stream.read(8)
    const type = String.fromCharCode(...head.subarray(4, 8))
    let size = new DataView(head.buffer).getUint32(0)
    let large: Uint8Array | undefined
    if (size === 1) {
      large = await stream.read(8)
      size = Number(new DataView(large.buffer).getBigUint64(0))
    }
    const header = large ? 16 : 8
    if (size < header) break
    if (type === 'moov') {
      const index = new Uint8Array(size)
      index.set(head)
      if (large) index.set(large, 8)
      index.set(await stream.read(size - header), header)
      return index.buffer
    }
    await stream.skipTo(offset + size)
  }
  throw new Error('MP4 index not found')
}

export async function playMp4WithMse(
  video: HTMLVideoElement,
  url: string,
  probe: Mp4Probe | undefined,
  options: {
    startTime: number
    resume: boolean
    refreshUrl?: string
    cacheKey?: string
    signal: AbortSignal
    onChapters?: (vtt: string) => void
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
  const cached = options.cacheKey ? await readCachedIndex(options.cacheKey, probe?.moov.size) : undefined
  const initial = cached
    ? undefined
    : probe
      ? new RangeStream(source, probe.moov.offset, probe.moov.size + minWindow)
      : new RangeStream(source, 0, locateWindow)
  options.signal.addEventListener('abort', () => initial?.cancel(), { once: true })
  let reusable: RangeStream | undefined = initial
  const supported = (kind: string, track: Mp4Track) =>
    Boolean(track.codec && track.orderedChunks && MediaSource.isTypeSupported(`${kind}/mp4; codecs="${track.codec}"`))

  let movie: ReturnType<typeof parseMoov>
  try {
    const stream = initial as RangeStream
    const index = cached ?? (probe ? (await stream.read(probe.moov.size)).buffer : await locateIndex(stream))
    movie = parseMoov(index)
    if (!cached && options.cacheKey) void storeIndex(options.cacheKey, index)
  } catch (error) {
    initial?.cancel()
    throw error
  }
  options.signal.throwIfAborted()
  const videoTrack = movie.tracks.find(track => track.type === 'vide' && supported('video', track))
  const audioTracks = movie.tracks.filter(track => track.type === 'soun' && supported('audio', track))
  if (movie.fragmented || !videoTrack || audioTracks.length === 0) {
    initial?.cancel()
    throw new Error('MP4 is not playable through MediaSource')
  }

  const tracks = [videoTrack, ...audioTracks]
  const lastOffset = Math.max(...tracks.map(track => track.chunkOffset(track.chunkCount - 1)))
  const bytesPerSecond = lastOffset / Math.max(1, movie.duration / movie.timescale)
  const windowSize = Math.min(maxWindow, Math.max(minWindow, Math.round(bytesPerSecond * 10)))
  if (initial) initial.windowSize = windowSize
  const shift = Math.max(0, -videoTrack.presentationOffset)
  const offsetOf = (track: Mp4Track) => track.presentationOffset + shift
  const toSeconds = (track: Mp4Track, time: number) => time / track.timescale + offsetOf(track)
  const toMedia = (track: Mp4Track, seconds: number) => Math.max(0, (seconds - offsetOf(track)) * track.timescale)
  const emitChapters = (chapters: Mp4Chapter[]) => {
    const vtt = chaptersVtt(
      chapters.map(chapter => ({ ...chapter, start: chapter.start + shift })),
      movie.duration / movie.timescale + shift,
    )
    if (vtt && !options.signal.aborted) options.onChapters?.(vtt)
  }
  if (movie.chapters.length > 0) emitChapters(movie.chapters)
  else if (movie.chapterTrack) {
    readChapterTrack(source.url, movie.chapterTrack, options.signal)
      .then(emitChapters)
      .catch(() => {})
  }
  const stores = new Map<Mp4Track, AudioStore>(audioTracks.map(track => [track, { samples: [], appended: 0 }]))
  let active = audioTracks[0]
  let sequence = 1
  let destroyed = false
  let session: Session | undefined
  let playhead = 0
  let lead: { start: number; end: number } | undefined
  let forwardLimit = forwardBuffer
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
      const now = video.currentTime
      const unplayed = lead && lead.end > now ? lead.end : Number.POSITIVE_INFINITY
      const from = Math.min(video.paused ? now : now + switchLead, unplayed)
      const behind = Math.max(0, now - 0.05)
      lead = from > behind ? { start: behind, end: from } : undefined
      await audioQueue.remove(0, behind)
      await audioQueue.remove(from, mediaSource.duration)
      if (next.codec !== previous.codec) await audioQueue.changeType(`audio/mp4; codecs="${next.codec}"`)
      await audioQueue.setOffset(offsetOf(next))
      await audioQueue.append(initSegment(next))
      const store = stores.get(next) as AudioStore
      const runs = audioRuns(next, (start, end) => (start < behind || end > from) && videoCovers(start, end))
      store.appended = store.samples.length
      await appendRuns(next, runs)
    }).catch(fail)

  const repairLead = () =>
    withAudio(async () => {
      const region = lead
      if (!region || destroyed) return
      lead = undefined
      await audioQueue.remove(region.start, region.end)
      await appendRuns(
        active,
        audioRuns(active, (start, end) => start < region.end && end > region.start && videoCovers(start, end)),
      )
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

  const videoCovers = (start: number, end: number) => {
    const { buffered } = videoQueue.sourceBuffer
    for (let index = 0; index < buffered.length; index++) {
      if (start < buffered.end(index) && end > buffered.start(index)) return true
    }
    return false
  }

  const audioRuns = (track: Mp4Track, wanted: (start: number, end: number) => boolean) => {
    const unique = new Map<number, StoredSample>()
    for (const sample of (stores.get(track) as AudioStore).samples) unique.set(sample.index, sample)
    const runs: StoredSample[][] = []
    let run: StoredSample[] = []
    for (const sample of [...unique.values()].sort((a, b) => a.index - b.index)) {
      const include = wanted(toSeconds(track, sample.dts), toSeconds(track, sample.dts + sample.duration))
      const previous = run[run.length - 1]
      if (!include || (previous && sample.index !== previous.index + 1)) {
        if (run.length > 0) runs.push(run)
        run = []
      }
      if (include) run.push(sample)
    }
    if (run.length > 0) runs.push(run)
    return runs
  }

  const appendRuns = async (track: Mp4Track, runs: StoredSample[][]) => {
    for (const run of runs) await appendWithEviction(audioQueue, mediaSegment(track.id, sequence++, run))
  }

  const trimBuffers = async (keep: number) => {
    if (keep <= 0) return
    await Promise.all([videoQueue.remove(0, keep), audioQueue.remove(0, keep)])
  }

  const nextPlaybackEvent = () =>
    new Promise<void>(resolve => {
      const done = () => {
        for (const type of ['timeupdate', 'seeking', 'emptied']) video.removeEventListener(type, done)
        resolve()
      }
      for (const type of ['timeupdate', 'seeking', 'emptied']) video.addEventListener(type, done)
    })

  const appendWithEviction = async (queue: BufferQueue, data: Uint8Array<ArrayBuffer>, current?: Session) => {
    for (let attempt = 0; !current?.aborted; attempt++) {
      try {
        await queue.append(data)
        return
      } catch (error) {
        if ((error as DOMException)?.name !== 'QuotaExceededError' || destroyed) throw error
        forwardLimit = Math.max(10, Math.min(forwardLimit, ahead() - 5))
        await trimBuffers(video.currentTime - 5)
        if (attempt > 0) await nextPlaybackEvent()
      }
    }
  }

  const flush = async (current: Session, samples: Mp4Sample[]) => {
    if (current.aborted) return
    if (samples.length > 0) {
      await appendWithEviction(videoQueue, mediaSegment(videoTrack.id, sequence++, samples), current)
      const last = samples[samples.length - 1]
      current.end = toSeconds(videoTrack, last.dts + last.duration)
    }
    await withAudio(async () => {
      if (current.aborted) return
      const store = stores.get(active) as AudioStore
      const next = store.samples.slice(store.appended)
      store.appended = store.samples.length
      if (next.length > 0) await appendWithEviction(audioQueue, mediaSegment(active.id, sequence++, next), current)
    })
  }

  const evict = async () => {
    const keep = video.currentTime - backBuffer
    const limit = video.currentTime + forwardLimit + 10
    const range = videoQueue.sourceBuffer.buffered
    if (keep > 0 && range.length > 0 && range.start(0) < keep - 5) await trimBuffers(keep)
    if (range.length > 0 && range.end(range.length - 1) > limit + 5) {
      await Promise.all([
        videoQueue.remove(limit, mediaSource.duration),
        audioQueue.remove(limit, mediaSource.duration),
      ])
    }
    await withAudio(() => {
      const { buffered } = videoQueue.sourceBuffer
      if (buffered.length === 0) return
      const earliest = buffered.start(0) - 1
      for (const [track, store] of stores) {
        let cursor = 0
        store.samples = store.samples.filter((sample, index) => {
          const kept = toSeconds(track, sample.dts + sample.duration) > earliest && toSeconds(track, sample.dts) < limit
          if (kept && index < store.appended) cursor++
          return kept
        })
        store.appended = cursor
      }
    })
  }

  const ahead = () => {
    const range = bufferedRange(videoQueue.sourceBuffer, video.currentTime)
    return range ? range.end - video.currentTime : 0
  }

  const backpressure = async (current: Session) => {
    if (ahead() > healthyAhead) await evict()
    if (!bufferedRange(videoQueue.sourceBuffer, video.currentTime) && current.end > video.currentTime + 1) {
      startSession(video.currentTime)
      return
    }
    while (!current.aborted && ahead() > forwardLimit) {
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
      for (const store of stores.values()) store.appended = store.samples.length
    })
    const stream = reusable && reusable.position <= startOffset ? reusable : new RangeStream(source, startOffset)
    stream.windowSize = windowSize
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
          else stores.get(track)?.samples.push({ ...entry, index: sample })
        }
        position += size
      }
      if (pending.length >= (flushed && ahead() > healthyAhead ? flushFrames : firstFlushFrames)) {
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

  const presentation = (sample: number) =>
    toSeconds(videoTrack, videoTrack.sampleDts(sample) + videoTrack.sampleCtsOffset(sample))

  const snapTarget = (time: number) => {
    const sample = videoTrack.sampleAtTime(toMedia(videoTrack, time))
    const before = presentation(videoTrack.syncSampleAtOrBefore(sample))
    const nextSync = videoTrack.nextSyncSample(sample)
    const after = nextSync === undefined ? undefined : presentation(nextSync)
    if (time - before <= 0.25) return time
    if (time < playhead - 0.1 || before > playhead + 0.5) return before + 0.001
    if (after !== undefined && after - time <= snapAhead) return after + 0.001
    return time
  }

  const onSeeking = () => {
    const requested = video.currentTime
    const snapped = snapTarget(requested)
    if (Math.abs(snapped - requested) > 0.05) {
      video.currentTime = snapped
      return
    }
    const time = requested
    playhead = time
    if (lead) void repairLead()
    const range = bufferedRange(videoQueue.sourceBuffer, time)
    const current = session && !session.aborted ? session : undefined
    if (current) {
      const upcoming = time >= current.start - 0.01 && time >= current.end - 0.1 && time <= Math.max(current.end, current.target) + 1
      const contiguous = range && Math.abs(range.end - current.end) < 1
      if (upcoming || contiguous) return
    }
    startSession(range ? range.end : time)
  }

  const onTimeUpdate = () => {
    if (video.seeking) return
    playhead = video.currentTime
    if (lead && (playhead > lead.end + 1 || playhead < lead.start - 1)) void repairLead()
    if (forwardLimit < forwardBuffer && ahead() < forwardLimit / 2) forwardLimit = Math.min(forwardBuffer, forwardLimit + 10)
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
