import type { Mp4Track } from './mp4'

export type Mp4Sample = { dts: number; duration: number; cts: number; sync: boolean; data: Uint8Array }

type Part = Uint8Array | number[]

const encoder = new TextEncoder()

const u32 = (value: number) => [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]

const u64 = (value: number) => [...u32(Math.floor(value / 2 ** 32)), ...u32(value >>> 0)]

function concat(parts: Part[]) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

const box = (type: string, ...parts: Part[]) => {
  const body = concat(parts)
  return concat([u32(body.length + 8), encoder.encode(type), body])
}

const fullBox = (type: string, version: number, flags: number, ...parts: Part[]) =>
  box(type, [version, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255], ...parts)

const matrix = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].flatMap(u32)

export function initSegment(track: Mp4Track) {
  const empty = (type: string) => fullBox(type, 0, 0, u32(0))
  const tkhd = track.tkhd.slice()
  tkhd[11] |= 3
  return concat([
    box('ftyp', encoder.encode('isom'), u32(0x200), encoder.encode('isomiso6mp41')),
    box(
      'moov',
      fullBox('mvhd', 0, 0, u32(0), u32(0), u32(1000), u32(0), u32(0x00010000), [1, 0], new Uint8Array(10), matrix, new Uint8Array(24), u32(0xffffffff)),
      box(
        'trak',
        tkhd,
        box(
          'mdia',
          track.mdhd,
          track.hdlr,
          box(
            'minf',
            track.mediaHeader,
            box('dinf', fullBox('dref', 0, 0, u32(1), fullBox('url ', 0, 1))),
            box('stbl', track.stsd, empty('stts'), empty('stsc'), fullBox('stsz', 0, 0, u32(0), u32(0)), empty('stco')),
          ),
        ),
      ),
      box('mvex', fullBox('trex', 0, 0, u32(track.id), u32(1), u32(0), u32(0), u32(0))),
    ),
  ])
}

export function mediaSegment(trackId: number, sequence: number, samples: Mp4Sample[]) {
  const withCts = samples.some(sample => sample.cts !== 0)
  const signed = samples.some(sample => sample.cts < 0)
  const entrySize = withCts ? 16 : 12
  const trunSize = 20 + samples.length * entrySize
  const moofSize = 8 + 16 + 8 + 16 + 20 + trunSize
  const entries = samples.flatMap(sample => [
    ...u32(sample.duration),
    ...u32(sample.data.length),
    ...u32(sample.sync ? 0x02000000 : 0x01010000),
    ...(withCts ? u32(sample.cts) : []),
  ])
  const moof = box(
    'moof',
    fullBox('mfhd', 0, 0, u32(sequence)),
    box(
      'traf',
      fullBox('tfhd', 0, 0x020000, u32(trackId)),
      fullBox('tfdt', 1, 0, u64(samples[0].dts)),
      fullBox('trun', signed ? 1 : 0, 0x000f01 & (withCts ? 0xffffff : 0xfff7ff), u32(samples.length), u32(moofSize + 8), entries),
    ),
  )
  const mdatSize = samples.reduce((sum, sample) => sum + sample.data.length, 0) + 8
  return concat([moof, u32(mdatSize), encoder.encode('mdat'), ...samples.map(sample => sample.data)])
}
