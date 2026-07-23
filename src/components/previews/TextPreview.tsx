import type { FC } from 'react'
import { DownloadFooter, PreviewContainer } from './Containers'
import FileContentPreview from './FileContentPreview'

const TextPreview: FC = () => (
  <FileContentPreview>
    {content => (
      <div>
        <PreviewContainer>
          <pre className="overflow-x-scroll p-0 text-sm md:p-3">{content}</pre>
        </PreviewContainer>
        <DownloadFooter />
      </div>
    )}
  </FileContentPreview>
)

export default TextPreview
