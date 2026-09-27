const maxBytes = 8 << 20
const pictureKey = 'METADATA_BLOCK_PICTURE='

const concat = (a: Uint8Array, b: Uint8Array) => {
  const out = new Uint8Array(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
}

const join = (parts: Uint8Array[]) => parts.reduce((all, part) => concat(all, part), new Uint8Array(0))

function readPicture(block: Uint8Array) {
  const view = new DataView(block.buffer, block.byteOffset, block.byteLength)
  const mimeLength = view.getUint32(4)
  const mime = new TextDecoder().decode(block.subarray(8, 8 + mimeLength))
  let position = 8 + mimeLength
  position += 4 + view.getUint32(position)
  const dataLength = view.getUint32(position + 16)
  const data = block.slice(position + 20, position + 20 + dataLength)
  return { type: view.getUint32(0), image: new Blob([data], { type: mime || 'image/jpeg' }) }
}

function readTags(packet: Uint8Array) {
  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength)
  if (new TextDecoder().decode(packet.subarray(0, 8)) !== 'OpusTags') return undefined
  let position = 12 + view.getUint32(8, true)
  const count = view.getUint32(position, true)
  position += 4
  let fallback: Blob | undefined
  for (let index = 0; index < count && position + 4 <= packet.length; index++) {
    const length = view.getUint32(position, true)
    const comment = packet.subarray(position + 4, position + 4 + length)
    position += 4 + length
    const key = new TextDecoder().decode(comment.subarray(0, pictureKey.length)).toUpperCase()
    if (key !== pictureKey) continue
    const binary = atob(new TextDecoder().decode(comment.subarray(pictureKey.length)))
    const picture = readPicture(Uint8Array.from(binary, char => char.charCodeAt(0)))
    if (picture.type === 3) return picture.image
    fallback ??= picture.image
  }
  return fallback
}

export async function readOpusCover(url: string, signal: AbortSignal) {
  const resp = await fetch(url, { headers: { Range: `bytes=0-${maxBytes - 1}` }, signal })
  const reader = resp.body?.getReader()
  if (!resp.ok || !reader) return undefined
  let buffer = new Uint8Array(0)
  let offset = 0
  let serial: number | undefined
  let current: Uint8Array[] = []
  let packets = 0
  try {
    for (;;) {
      while (buffer.length - offset >= 27) {
        if (new TextDecoder().decode(buffer.subarray(offset, offset + 4)) !== 'OggS') return undefined
        const segments = buffer[offset + 26]
        if (buffer.length - offset < 27 + segments) break
        let bodyLength = 0
        for (let index = 0; index < segments; index++) bodyLength += buffer[offset + 27 + index]
        if (buffer.length - offset < 27 + segments + bodyLength) break
        const pageSerial = new DataView(buffer.buffer, buffer.byteOffset + offset + 14, 4).getUint32(0, true)
        serial ??= pageSerial
        if (pageSerial === serial) {
          let body = offset + 27 + segments
          for (let index = 0; index < segments; index++) {
            const length = buffer[offset + 27 + index]
            current.push(buffer.subarray(body, body + length))
            body += length
            if (length === 255) continue
            packets++
            if (packets === 2) return readTags(join(current))
            current = []
          }
        }
        offset += 27 + segments + bodyLength
      }
      const { done, value } = await reader.read()
      if (done) return undefined
      buffer = concat(buffer.subarray(offset), value)
      offset = 0
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
}
