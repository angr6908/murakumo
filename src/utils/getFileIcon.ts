import {
  BookOpen,
  File,
  FileArchive,
  FileCode,
  FileImage,
  FileMusic,
  FilePenLine,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideoCamera,
  Link,
  type LucideIcon,
  Presentation,
} from 'lucide-react'
import { extensionCategory, type FileCategory } from './fileType'

const iconForCategory: Record<FileCategory, LucideIcon> = {
  image: FileImage,
  pdf: FileType,
  office: FileText,
  markdown: FilePenLine,
  code: FileCode,
  text: FileText,
  video: FileVideoCamera,
  audio: FileMusic,
  epub: BookOpen,
  book: BookOpen,
  url: Link,
  archive: FileArchive,
}

// Office documents have distinct icons per actual format, so resolve them before the category.
const officeIconBySubtype: Record<string, LucideIcon> = {
  doc: FileText,
  docx: FileText,
  ppt: Presentation,
  pptx: Presentation,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
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
