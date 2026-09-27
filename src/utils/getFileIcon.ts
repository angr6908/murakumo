import {
  Archive,
  BookOpen,
  Clapperboard,
  CodeXml,
  File,
  Hash,
  Image,
  Link,
  type LucideIcon,
  Music,
  NotebookText,
  Presentation,
  ScrollText,
  Sheet,
  TextAlignStart,
} from 'lucide-react'
import { extensionCategory, type FileCategory } from './fileType'

const iconForCategory: Record<FileCategory, LucideIcon> = {
  image: Image,
  pdf: ScrollText,
  office: NotebookText,
  markdown: Hash,
  code: CodeXml,
  text: TextAlignStart,
  video: Clapperboard,
  audio: Music,
  epub: BookOpen,
  book: BookOpen,
  url: Link,
  archive: Archive,
}

// Office documents have distinct icons per actual format, so resolve them before the category.
const officeIconBySubtype: Record<string, LucideIcon> = {
  doc: NotebookText,
  docx: NotebookText,
  ppt: Presentation,
  pptx: Presentation,
  xls: Sheet,
  xlsx: Sheet,
}

export function getRawExtension(fileName: string): string {
  return fileName.slice(((fileName.lastIndexOf('.') - 1) >>> 0) + 2)
}
export function getExtension(fileName: string): string {
  return getRawExtension(fileName).toLowerCase()
}
/** Drop the trailing `.ext` from a file name or path. */
export function stripExtension(fileName: string): string {
  return fileName.slice(0, fileName.lastIndexOf('.'))
}

export function getFileIcon(fileName: string, flags?: { video?: boolean }): LucideIcon {
  const extension = getExtension(fileName)
  if (extension === 'ts' && flags?.video) return iconForCategory.video

  const category = extensionCategory[extension]
  if (category === 'office') return officeIconBySubtype[extension] ?? iconForCategory.office
  return category ? iconForCategory[category] : File
}
