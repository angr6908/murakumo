import dynamic from 'next/dynamic'
import type { FC } from 'react'

import type { OdFileObject } from '../../types'
import { getLanguageByFileName } from '../../utils/getPreviewType'
import { DownloadFooter, PreviewContainer } from './Containers'
import FileContentPreview from './FileContentPreview'

const SyntaxHighlighter = dynamic(() => import('./SyntaxHighlighter'), { ssr: false })

const CodePreview: FC<{ file: OdFileObject }> = ({ file }) => {
  return (
    <FileContentPreview>
      {content => (
        <>
          <PreviewContainer>
            <SyntaxHighlighter language={getLanguageByFileName(file.name)}>{content}</SyntaxHighlighter>
          </PreviewContainer>
          <DownloadFooter />
        </>
      )}
    </FileContentPreview>
  )
}

export default CodePreview
