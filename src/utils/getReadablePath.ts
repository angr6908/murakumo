export function getReadablePath(path: string) {
  return path
    .split('/')
    .map(s => decodeURIComponent(s))
    .map(s =>
      Array.from(s)
        .map(c => (isSafeChar(c) ? c : encodeURIComponent(c)))
        .join(''),
    )
    .join('/')
}

function isSafeChar(c: string) {
  if (c.charCodeAt(0) < 0x80) return /^[a-zA-Z0-9\-._~*:@,!]$/.test(c)
  return !/\s|\u180e/.test(c)
}
