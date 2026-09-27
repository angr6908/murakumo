export type Box = { type: string; offset: number; header: number; size: number }

export type Mp4ProbeTrack = { id: number; type: string; name: string; language: string; codec?: string }
export type Mp4Probe = { moov: { offset: number; size: number }; fragmented: boolean; tracks: Mp4ProbeTrack[] }

export type Mp4Track = {
  id: number
  type: string
  name: string
  language: string
  codec?: string
  timescale: number
  presentationOffset: number
  sampleCount: number
  chunkCount: number
  orderedChunks: boolean
  tkhd: Uint8Array
  mdhd: Uint8Array
  hdlr: Uint8Array
  mediaHeader: Uint8Array
  stsd: Uint8Array
  hasCtts: boolean
  sampleSize(sample: number): number
  sampleDts(sample: number): number
  sampleDuration(sample: number): number
  sampleCtsOffset(sample: number): number
  isSync(sample: number): boolean
  sampleAtTime(time: number): number
  syncSampleAtOrBefore(sample: number): number
  nextSyncSample(sample: number): number | undefined
  chunkOffset(chunk: number): number
  chunkFirstSample(chunk: number): number
  chunkSampleCount(chunk: number): number
  sampleChunk(sample: number): number
  firstChunkAtOrAfter(offset: number): number
}

export type Mp4Movie = { timescale: number; duration: number; fragmented: boolean; tracks: Mp4Track[] }

const genericName = /^(?:|sound ?handler|.*sound media handler|core media audio|.*audio handler)$/i
const probeChunkSize = 4096
const probeBlockSize = 65536
const decoder = new TextDecoder()

export const fourcc = (view: DataView, offset: number) =>
  String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  )

export function* boxes(view: DataView, start: number, end: number): Generator<Box> {
  let offset = start
  const limit = Math.min(end, view.byteLength)
  while (offset + 8 <= limit) {
    const size32 = view.getUint32(offset)
    const header = size32 === 1 ? 16 : 8
    if (offset + header > limit) return
    const size = size32 === 1 ? Number(view.getBigUint64(offset + 8)) : size32 === 0 ? end - offset : size32
    if (size < header) return
    yield { type: fourcc(view, offset + 4), offset, header, size }
    offset += size
  }
}

const child = (view: DataView, parent: Box, type: string) =>
  [...boxes(view, parent.offset + parent.header, parent.offset + parent.size)].find(box => box.type === type)

const descendant = (view: DataView, parent: Box | undefined, ...path: string[]) =>
  path.reduce<Box | undefined>((box, type) => box && child(view, box, type), parent)

const payload = (box: Box) => box.offset + box.header

const hex = (value: number, width = 2) => value.toString(16).toUpperCase().padStart(width, '0')

const pad2 = (value: number) => String(value).padStart(2, '0')

function readHandler(view: DataView, hdlr: Box) {
  const start = payload(hdlr)
  const type = fourcc(view, start + 8)
  const end = Math.min(hdlr.offset + hdlr.size, view.byteLength)
  let name = new Uint8Array(view.buffer, view.byteOffset + start + 24, Math.max(0, end - start - 24))
  if (name.length > 0 && name[0] === name.length - 1) name = name.subarray(1)
  const text = decoder.decode(name).replace(/\0[\s\S]*$/, '').trim()
  return { type, name: genericName.test(text) ? '' : text }
}

function readMdhd(view: DataView, mdhd: Box) {
  const start = payload(mdhd)
  const v1 = view.getUint8(start) === 1
  const packed = view.getUint16(start + (v1 ? 32 : 20))
  const language = [10, 5, 0].map(shift => String.fromCharCode(((packed >> shift) & 31) + 0x60)).join('')
  return { timescale: view.getUint32(start + (v1 ? 20 : 12)), language: /^[a-z]{3}$/.test(language) ? language : 'und' }
}

function readDescriptor(view: DataView, offset: number) {
  const tag = view.getUint8(offset)
  let size = 0
  let cursor = offset + 1
  for (let i = 0; i < 4; i++) {
    const byte = view.getUint8(cursor++)
    size = (size << 7) | (byte & 0x7f)
    if (!(byte & 0x80)) break
  }
  return { tag, size, body: cursor }
}

function mp4aCodec(view: DataView, esds: Box) {
  const es = readDescriptor(view, payload(esds) + 4)
  if (es.tag !== 3) return undefined
  const flags = view.getUint8(es.body + 2)
  let cursor = es.body + 3
  if (flags & 0x80) cursor += 2
  if (flags & 0x40) cursor += 1 + view.getUint8(cursor)
  if (flags & 0x20) cursor += 2
  const config = readDescriptor(view, cursor)
  if (config.tag !== 4) return undefined
  const objectType = view.getUint8(config.body)
  if (objectType !== 0x40) return `mp4a.${hex(objectType)}`
  const specific = readDescriptor(view, config.body + 13)
  if (specific.tag !== 5) return 'mp4a.40.2'
  const first = view.getUint8(specific.body)
  const audioObjectType =
    first >> 3 === 31 ? 32 + (((first & 7) << 3) | (view.getUint8(specific.body + 1) >> 5)) : first >> 3
  return `mp4a.40.${audioObjectType}`
}

function hevcCodec(type: string, view: DataView, hvcC: Box) {
  const start = payload(hvcC)
  const first = view.getUint8(start + 1)
  const compatibility = view.getUint32(start + 2)
  let reversed = 0
  for (let bit = 0; bit < 32; bit++) if (compatibility & (1 << bit)) reversed |= 1 << (31 - bit)
  const constraints = Array.from({ length: 6 }, (_, i) => view.getUint8(start + 6 + i))
  while (constraints.length > 0 && constraints[constraints.length - 1] === 0) constraints.pop()
  return [
    type,
    `${['', 'A', 'B', 'C'][first >> 6]}${first & 31}`,
    (reversed >>> 0).toString(16).toUpperCase(),
    `${(first >> 5) & 1 ? 'H' : 'L'}${view.getUint8(start + 12)}`,
    ...constraints.map(value => hex(value)),
  ].join('.')
}

export function codecString(view: DataView, stsd: Box): string | undefined {
  const [entry] = boxes(view, payload(stsd) + 8, stsd.offset + stsd.size)
  if (!entry) return undefined
  const { type } = entry
  const end = entry.offset + entry.size
  const find = (start: number, name: string) => [...boxes(view, start, end)].find(box => box.type === name)
  const videoChildren = payload(entry) + 78
  const soundVersion = view.getUint16(payload(entry) + 8)
  const audioChildren = payload(entry) + 28 + (soundVersion === 1 ? 16 : soundVersion === 2 ? 36 : 0)

  switch (type) {
    case 'av01': {
      const av1C = find(videoChildren, 'av1C')
      if (!av1C) return undefined
      const first = view.getUint8(payload(av1C) + 1)
      const second = view.getUint8(payload(av1C) + 2)
      const bitDepth = second & 0x40 ? (second & 0x20 ? 12 : 10) : 8
      return `av01.${first >> 5}.${pad2(first & 31)}${second & 0x80 ? 'H' : 'M'}.${pad2(bitDepth)}`
    }
    case 'avc1':
    case 'avc3': {
      const avcC = find(videoChildren, 'avcC')
      if (!avcC) return undefined
      const start = payload(avcC)
      return `${type}.${hex(view.getUint8(start + 1))}${hex(view.getUint8(start + 2))}${hex(view.getUint8(start + 3))}`
    }
    case 'hvc1':
    case 'hev1': {
      const hvcC = find(videoChildren, 'hvcC')
      return hvcC && hevcCodec(type, view, hvcC)
    }
    case 'vp09': {
      const vpcC = find(videoChildren, 'vpcC')
      if (!vpcC) return undefined
      const start = payload(vpcC) + 4
      return `vp09.${pad2(view.getUint8(start))}.${pad2(view.getUint8(start + 1))}.${pad2(view.getUint8(start + 2) >> 4)}`
    }
    case 'mp4a': {
      const esds = find(audioChildren, 'esds')
      return esds ? mp4aCodec(view, esds) : 'mp4a.40.2'
    }
    case 'Opus':
      return 'opus'
    case 'fLaC':
      return 'flac'
    case 'ac-3':
    case 'ec-3':
      return type
    default:
      return undefined
  }
}

function probeTrack(view: DataView, trak: Box): Mp4ProbeTrack | undefined {
  const tkhd = child(view, trak, 'tkhd')
  const mdia = child(view, trak, 'mdia')
  const mdhd = mdia && child(view, mdia, 'mdhd')
  const hdlr = mdia && child(view, mdia, 'hdlr')
  if (!tkhd || !mdhd || !hdlr) return undefined
  const tkhdStart = payload(tkhd)
  const stsd = descendant(view, mdia, 'minf', 'stbl', 'stsd')
  const handler = readHandler(view, hdlr)
  return {
    id: view.getUint32(tkhdStart + (view.getUint8(tkhdStart) === 1 ? 20 : 12)),
    type: handler.type,
    name: handler.name,
    language: readMdhd(view, mdhd).language,
    codec: stsd ? codecString(view, stsd) : undefined,
  }
}

async function readRange(url: string, start: number, length: number, signal?: AbortSignal) {
  const resp = await fetch(url, { headers: { Range: `bytes=${start}-${start + length - 1}` }, signal })
  if (resp.status !== 206) {
    await resp.body?.cancel()
    throw new Error(`Range request failed: ${resp.status}`)
  }
  return new DataView(await resp.arrayBuffer())
}

export async function probeMp4(url: string, signal?: AbortSignal): Promise<Mp4Probe | null> {
  let block: { start: number; data: DataView } | undefined
  const readAt = async (offset: number, length: number) => {
    if (!block || offset < block.start || offset + length > block.start + block.data.byteLength) {
      block = { start: offset, data: await readRange(url, offset, Math.max(length, probeBlockSize), signal) }
    }
    const available = block.start + block.data.byteLength - offset
    return new DataView(block.data.buffer, block.data.byteOffset + offset - block.start, Math.max(0, available))
  }

  let offset = 0
  let moov: Box | undefined
  for (let hops = 0; hops < 16 && !moov; hops++) {
    const [box] = boxes(await readAt(offset, 16), 0, Number.MAX_SAFE_INTEGER)
    if (!box || box.size === Number.MAX_SAFE_INTEGER) return null
    if (box.type === 'moov') moov = { ...box, offset }
    offset += box.size
  }
  if (!moov) return null

  const tracks: Mp4ProbeTrack[] = []
  let fragmented = false
  let cursor = moov.offset + moov.header
  while (cursor < moov.offset + moov.size) {
    const view = await readAt(cursor, probeChunkSize)
    const [box] = boxes(view, 0, Number.MAX_SAFE_INTEGER)
    if (!box) break
    if (box.type === 'mvex') fragmented = true
    const track = box.type === 'trak' ? probeTrack(view, box) : undefined
    if (track) tracks.push(track)
    cursor += box.size
  }
  return { moov: { offset: moov.offset, size: moov.size }, fragmented, tracks }
}

const upperBound = (values: ArrayLike<number>, value: number) => {
  let low = 0
  let high = values.length
  while (low < high) {
    const mid = (low + high) >>> 1
    if (values[mid] <= value) low = mid + 1
    else high = mid
  }
  return low
}

function readTrack(view: DataView, trak: Box, movieTimescale: number): Mp4Track | undefined {
  const tkhd = child(view, trak, 'tkhd')
  const mdia = child(view, trak, 'mdia')
  const mdhd = mdia && child(view, mdia, 'mdhd')
  const hdlr = mdia && child(view, mdia, 'hdlr')
  const minf = mdia && child(view, mdia, 'minf')
  const stbl = minf && child(view, minf, 'stbl')
  const mediaHeader = minf && [...boxes(view, payload(minf), minf.offset + minf.size)].find(box => box.type.endsWith('mhd'))
  const stsd = stbl && child(view, stbl, 'stsd')
  const stts = stbl && child(view, stbl, 'stts')
  const stsc = stbl && child(view, stbl, 'stsc')
  const stsz = stbl && child(view, stbl, 'stsz')
  const stco = stbl && (child(view, stbl, 'stco') ?? child(view, stbl, 'co64'))
  if (!tkhd || !mdhd || !hdlr || !mediaHeader || !stsd || !stts || !stsc || !stsz || !stco) return undefined

  const bytes = (box: Box) => new Uint8Array(view.buffer, view.byteOffset + box.offset, box.size)
  const tkhdStart = payload(tkhd)
  const { timescale, language } = readMdhd(view, mdhd)
  const handler = readHandler(view, hdlr)

  const sttsCount = view.getUint32(payload(stts) + 4)
  const runSample = new Float64Array(sttsCount + 1)
  const runDts = new Float64Array(sttsCount + 1)
  const runDelta = new Float64Array(sttsCount)
  for (let i = 0; i < sttsCount; i++) {
    const entry = payload(stts) + 8 + i * 8
    runDelta[i] = view.getUint32(entry + 4)
    runSample[i + 1] = runSample[i] + view.getUint32(entry)
    runDts[i + 1] = runDts[i] + view.getUint32(entry) * runDelta[i]
  }

  const ctts = child(view, stbl, 'ctts')
  const cttsCount = ctts ? view.getUint32(payload(ctts) + 4) : 0
  const cttsSample = new Float64Array(cttsCount + 1)
  const cttsOffset = new Int32Array(cttsCount)
  for (let i = 0; i < cttsCount; i++) {
    const entry = payload(ctts as Box) + 8 + i * 8
    cttsOffset[i] = view.getInt32(entry + 4)
    cttsSample[i + 1] = cttsSample[i] + view.getUint32(entry)
  }

  const stscCount = view.getUint32(payload(stsc) + 4)
  const stscChunk = new Float64Array(stscCount)
  const stscSpc = new Float64Array(stscCount)
  const stscFirstSample = new Float64Array(stscCount)
  for (let i = 0; i < stscCount; i++) {
    const entry = payload(stsc) + 8 + i * 12
    stscChunk[i] = view.getUint32(entry) - 1
    stscSpc[i] = view.getUint32(entry + 4)
    if (i > 0) stscFirstSample[i] = stscFirstSample[i - 1] + (stscChunk[i] - stscChunk[i - 1]) * stscSpc[i - 1]
  }

  const constantSize = view.getUint32(payload(stsz) + 4)
  const sampleCount = view.getUint32(payload(stsz) + 8)
  const sizeTable = payload(stsz) + 12

  const co64 = stco.type === 'co64'
  const chunkCount = view.getUint32(payload(stco) + 4)
  const chunkTable = payload(stco) + 8
  const chunkOffset = (chunk: number) =>
    co64 ? Number(view.getBigUint64(chunkTable + chunk * 8)) : view.getUint32(chunkTable + chunk * 4)
  let orderedChunks = true
  for (let i = 1; i < chunkCount && orderedChunks; i++) orderedChunks = chunkOffset(i) >= chunkOffset(i - 1)

  const stss = child(view, stbl, 'stss')
  const syncSamples = stss
    ? Uint32Array.from({ length: view.getUint32(payload(stss) + 4) }, (_, i) => view.getUint32(payload(stss) + 8 + i * 4) - 1)
    : undefined

  let presentationOffset = 0
  const elst = descendant(view, trak, 'edts', 'elst')
  if (elst) {
    const v1 = view.getUint8(payload(elst)) === 1
    const entrySize = v1 ? 20 : 12
    let empty = 0
    for (let i = 0; i < view.getUint32(payload(elst) + 4); i++) {
      const entry = payload(elst) + 8 + i * entrySize
      const duration = v1 ? Number(view.getBigUint64(entry)) : view.getUint32(entry)
      const mediaTime = v1 ? Number(view.getBigInt64(entry + 8)) : view.getInt32(entry + 4)
      if (mediaTime === -1) {
        empty += duration
        continue
      }
      presentationOffset = empty / movieTimescale - mediaTime / timescale
      break
    }
  }

  const sttsRun = (sample: number) => Math.max(0, upperBound(runSample, sample) - 1)
  const stscRunByChunk = (chunk: number) => Math.max(0, upperBound(stscChunk, chunk) - 1)
  const stscRunBySample = (sample: number) => Math.max(0, upperBound(stscFirstSample, sample) - 1)

  return {
    id: view.getUint32(tkhdStart + (view.getUint8(tkhdStart) === 1 ? 20 : 12)),
    type: handler.type,
    name: handler.name,
    language,
    codec: codecString(view, stsd),
    timescale,
    presentationOffset,
    sampleCount,
    chunkCount,
    orderedChunks,
    tkhd: bytes(tkhd),
    mdhd: bytes(mdhd),
    hdlr: bytes(hdlr),
    mediaHeader: bytes(mediaHeader),
    stsd: bytes(stsd),
    hasCtts: cttsCount > 0,
    sampleSize: sample => constantSize || view.getUint32(sizeTable + sample * 4),
    sampleDts(sample) {
      const run = sttsRun(sample)
      return runDts[run] + (sample - runSample[run]) * runDelta[run]
    },
    sampleDuration: sample => runDelta[Math.min(sttsRun(sample), sttsCount - 1)] ?? 0,
    sampleCtsOffset: sample => (cttsCount ? cttsOffset[Math.max(0, upperBound(cttsSample, sample) - 1)] : 0),
    isSync: sample => !syncSamples || syncSamples[upperBound(syncSamples, sample) - 1] === sample,
    sampleAtTime(time) {
      const run = Math.min(Math.max(0, upperBound(runDts, time) - 1), sttsCount - 1)
      const sample = runSample[run] + Math.floor((time - runDts[run]) / (runDelta[run] || 1))
      return Math.min(Math.max(0, sample), sampleCount - 1)
    },
    syncSampleAtOrBefore: sample => (syncSamples ? (syncSamples[Math.max(0, upperBound(syncSamples, sample) - 1)] ?? 0) : sample),
    nextSyncSample: sample =>
      syncSamples ? syncSamples[upperBound(syncSamples, sample)] : sample + 1 < sampleCount ? sample + 1 : undefined,
    chunkOffset,
    chunkFirstSample(chunk) {
      const run = stscRunByChunk(chunk)
      return stscFirstSample[run] + (chunk - stscChunk[run]) * stscSpc[run]
    },
    chunkSampleCount: chunk => stscSpc[stscRunByChunk(chunk)],
    sampleChunk(sample) {
      const run = stscRunBySample(sample)
      return stscChunk[run] + Math.floor((sample - stscFirstSample[run]) / stscSpc[run])
    },
    firstChunkAtOrAfter(offset) {
      let low = 0
      let high = chunkCount
      while (low < high) {
        const mid = (low + high) >>> 1
        if (chunkOffset(mid) < offset) low = mid + 1
        else high = mid
      }
      return low
    },
  }
}

export function parseMoov(buffer: ArrayBuffer): Mp4Movie {
  const view = new DataView(buffer)
  const [moov] = boxes(view, 0, buffer.byteLength)
  if (!moov || moov.type !== 'moov') throw new Error('Not a moov box')
  const mvhd = child(view, moov, 'mvhd')
  if (!mvhd) throw new Error('Missing mvhd')
  const v1 = view.getUint8(payload(mvhd)) === 1
  const timescale = view.getUint32(payload(mvhd) + (v1 ? 20 : 12))
  const duration = v1 ? Number(view.getBigUint64(payload(mvhd) + 24)) : view.getUint32(payload(mvhd) + 16)
  const tracks = [...boxes(view, payload(moov), moov.offset + moov.size)]
    .filter(box => box.type === 'trak')
    .map(trak => readTrack(view, trak, timescale))
    .filter((track): track is Mp4Track => Boolean(track))
  return { timescale, duration, fragmented: Boolean(child(view, moov, 'mvex')), tracks }
}

export function* chunksFrom(tracks: Mp4Track[], offset: number) {
  const cursors = tracks.map(track => ({ track, chunk: track.firstChunkAtOrAfter(offset) }))
  while (true) {
    let best: (typeof cursors)[number] | undefined
    for (const cursor of cursors) {
      if (cursor.chunk >= cursor.track.chunkCount) continue
      if (!best || cursor.track.chunkOffset(cursor.chunk) < best.track.chunkOffset(best.chunk)) best = cursor
    }
    if (!best) return
    yield { track: best.track, chunk: best.chunk, offset: best.track.chunkOffset(best.chunk) }
    best.chunk++
  }
}
