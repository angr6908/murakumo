/**
 * The single extension -> category table for the whole app. Both the icon resolver
 * (`getFileIcon`, from getFileIcon.ts) and the preview renderers consume
 * this one source of truth so an extension can never be labelled one way for icons and another
 * for previews.
 */
export type FileCategory =
  | 'image'
  | 'markdown'
  | 'pdf'
  | 'office'
  | 'code'
  | 'text'
  | 'video'
  | 'audio'
  | 'epub'
  | 'url'
  | 'archive'
  | 'book'

/** extensions -> category, lowercase, no leading dot. Unknown extensions fall back to a generic file. */
const extensionCategory: Record<string, FileCategory> = {
  // images
  gif: 'image',
  jpeg: 'image',
  jpg: 'image',
  png: 'image',
  heic: 'image',
  webp: 'image',

  // markdown
  md: 'markdown',
  markdown: 'markdown',
  mdown: 'markdown',

  pdf: 'pdf',

  // office
  doc: 'office',
  docx: 'office',
  ppt: 'office',
  pptx: 'office',
  xls: 'office',
  xlsx: 'office',

  // code (ts is also a video container — resolved by the caller's file.video flag)
  c: 'code',
  cpp: 'code',
  js: 'code',
  jsx: 'code',
  java: 'code',
  sh: 'code',
  cs: 'code',
  py: 'code',
  css: 'code',
  html: 'code',
  ts: 'code',
  tsx: 'code',
  rs: 'code',
  vue: 'code',
  json: 'code',
  yml: 'code',
  yaml: 'code',
  toml: 'code',

  // plain text listings
  txt: 'text',
  vtt: 'text',
  srt: 'text',
  rtf: 'text',
  log: 'text',
  diff: 'text',

  // video
  mp4: 'video',
  flv: 'video',
  webm: 'video',
  m3u8: 'video',
  mkv: 'video',
  mov: 'video',
  avi: 'video', // won't play in-browser

  // audio
  mp3: 'audio',
  m4a: 'audio',
  aac: 'audio',
  wav: 'audio',
  ogg: 'audio',
  oga: 'audio',
  opus: 'audio',
  flac: 'audio',

  // e-books
  epub: 'epub',
  mobi: 'book',
  azw3: 'book',

  url: 'url',

  // archives (icon-only; no preview)
  '7z': 'archive',
  bz2: 'archive',
  xz: 'archive',
  wim: 'archive',
  gz: 'archive',
  rar: 'archive',
  tar: 'archive',
  zip: 'archive',
}

export function getRawExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot > 0 ? fileName.slice(dot + 1) : ''
}

export function getExtension(fileName: string): string {
  return getRawExtension(fileName).toLowerCase()
}

/** Drop the trailing `.ext` from a file name or path. */
export function stripExtension(fileName: string): string {
  return fileName.slice(0, fileName.lastIndexOf('.'))
}

export function getFileCategory(fileName: string, flags?: { video?: boolean }): FileCategory | undefined {
  const extension = getExtension(fileName)
  return extension === 'ts' && flags?.video ? 'video' : extensionCategory[extension]
}
