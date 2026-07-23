import type { FC } from 'react'
import { DownloadButton } from '../DownloadBtnGtoup'
import { DownloadBtnContainer, PreviewContainer } from './Containers'
import FileContentPreview from './FileContentPreview'

const parseDotUrl = (content: string): string | undefined => {
  return content
    .split('\n')
    .find(line => line.startsWith('URL='))
    ?.split('=')[1]
}

const URLPreview: FC = () => (
  <FileContentPreview>
    {content => {
      const url = parseDotUrl(content) ?? ''

      return (
        <div>
          <PreviewContainer>
            <pre className="overflow-x-scroll p-0 text-sm md:p-3">{content}</pre>
          </PreviewContainer>
          <DownloadBtnContainer>
            <div className="flex justify-center">
              <DownloadButton
                onClickCallback={() => window.open(url)}
                btnColor="blue"
                btnText={'Open URL'}
                btnIcon="external-link-alt"
                btnTitle={`Open ${url}`}
              />
            </div>
          </DownloadBtnContainer>
        </div>
      )
    }}
  </FileContentPreview>
)

export default URLPreview
