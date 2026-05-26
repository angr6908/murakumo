import { getExtension } from './getFileIcon'

export const preview = {
  markdown: 'markdown',
  image: 'image',
  text: 'text',
  pdf: 'pdf',
  code: 'code',
  video: 'video',
  audio: 'audio',
  office: 'ms-office',
  epub: 'epub',
  url: 'url',
}

export const extensions = {
  gif: preview.image,
  jpeg: preview.image,
  jpg: preview.image,
  png: preview.image,
  webp: preview.image,

  md: preview.markdown,
  markdown: preview.markdown,
  mdown: preview.markdown,

  pdf: preview.pdf,

  doc: preview.office,
  docx: preview.office,
  ppt: preview.office,
  pptx: preview.office,
  xls: preview.office,
  xlsx: preview.office,

  c: preview.code,
  cpp: preview.code,
  js: preview.code,
  jsx: preview.code,
  java: preview.code,
  sh: preview.code,
  cs: preview.code,
  py: preview.code,
  css: preview.code,
  html: preview.code,
  // typescript or video file, determined below
  ts: preview.code,
  tsx: preview.code,
  rs: preview.code,
  vue: preview.code,
  json: preview.code,
  yml: preview.code,
  yaml: preview.code,
  toml: preview.code,

  txt: preview.text,
  vtt: preview.text,
  srt: preview.text,
  log: preview.text,
  diff: preview.text,

  mp4: preview.video,
  flv: preview.video,
  webm: preview.video,
  m3u8: preview.video,
  mkv: preview.video,
  mov: preview.video,
  avi: preview.video, // won't work!

  mp3: preview.audio,
  m4a: preview.audio,
  aac: preview.audio,
  wav: preview.audio,
  ogg: preview.audio,
  oga: preview.audio,
  opus: preview.audio,
  flac: preview.audio,

  epub: preview.epub,

  url: preview.url,
} as Record<string, string>

const languageAliases: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  rs: 'rust',
  js: 'javascript',
  jsx: 'javascript',
  sh: 'shell',
  cs: 'csharp',
  py: 'python',
  yml: 'yaml',
}

export function getPreviewType(extension: string, flags?: { video?: boolean }): string | undefined {
  if (extension === 'ts' && flags?.video) return preview.video
  return extensions[extension]
}

export function getLanguageByFileName(filename: string): string {
  const extension = getExtension(filename)
  return languageAliases[extension] ?? extension
}
