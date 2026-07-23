import dynamic from 'next/dynamic'
import type { FC } from 'react'
import useSystemTheme from 'react-use-system-theme'

import type { OdFileObject } from '../../types'
import { getLanguageByFileName } from '../../utils/getPreviewType'
import { DownloadFooter, PreviewContainer } from './Containers'
import FileContentPreview from './FileContentPreview'

const SyntaxHighlighter = dynamic(() => import('./SyntaxHighlighter'), { ssr: false })

const CodePreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const theme = useSystemTheme('dark')

  return (
    <FileContentPreview>
      {content => (
        <>
          <PreviewContainer>
            <SyntaxHighlighter
              language={getLanguageByFileName(file.name)}
              styleName={theme === 'dark' ? 'tomorrowNightEighties' : 'tomorrow'}
            >
              {content}
            </SyntaxHighlighter>
          </PreviewContainer>
          <DownloadFooter />
        </>
      )}
    </FileContentPreview>
  )
}

export default CodePreview
