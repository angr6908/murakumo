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
import { type FileCategory, getExtension, getFileCategory } from './fileType'

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
  ppt: Presentation,
  pptx: Presentation,
  xls: Sheet,
  xlsx: Sheet,
}

export function getFileIcon(fileName: string, flags?: { video?: boolean }): LucideIcon {
  const category = getFileCategory(fileName, flags)
  if (category === 'office') return officeIconBySubtype[getExtension(fileName)] ?? iconForCategory.office
  return category ? iconForCategory[category] : File
}
