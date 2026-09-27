import type { FC } from 'react'
import { DownloadFooter, PreviewContainer } from './Containers'
import FileContentPreview from './FileContentPreview'

const TextPreview: FC = () => (
  <FileContentPreview>
    {content => (
      <div>
        <PreviewContainer>
          <pre className="scroll-thin overflow-x-auto font-mono text-control">{content}</pre>
        </PreviewContainer>
        <DownloadFooter />
      </div>
    )}
  </FileContentPreview>
)

export default TextPreview
