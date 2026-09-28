import dynamic from 'next/dynamic'
import type { FC } from 'react'

import type { OdFileObject } from '../../types'
import { getExtension } from '../../utils/fileType'
import FileContentPreview from './FileContentPreview'

const SyntaxHighlighter = dynamic(() => import('./SyntaxHighlighter'), { ssr: false })

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

const CodePreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const extension = getExtension(file.name)
  return (
    <FileContentPreview>
      {content => (
        <SyntaxHighlighter language={languageAliases[extension] ?? extension}>{content}</SyntaxHighlighter>
      )}
    </FileContentPreview>
  )
}

export default CodePreview
