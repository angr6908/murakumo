import type { FC, ReactNode } from 'react'
import FileContentPreview from './FileContentPreview'

const TextPreview: FC<{ footer?: (content: string) => ReactNode }> = ({ footer }) => (
  <FileContentPreview footer={footer}>
    {content => <pre className="scroll-thin overflow-x-auto font-mono text-control">{content}</pre>}
  </FileContentPreview>
)

export default TextPreview
