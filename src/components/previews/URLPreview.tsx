import { ExternalLink } from 'lucide-react'
import type { FC } from 'react'
import { useI18n } from '../../i18n'
import { DownloadButton } from '../DownloadBtnGtoup'
import { DownloadFooter, PreviewContainer } from './Containers'
import FileContentPreview from './FileContentPreview'

const parseDotUrl = (content: string): string | undefined => {
  return content
    .split('\n')
    .find(line => line.startsWith('URL='))
    ?.split('=')[1]
}

const URLPreview: FC = () => {
  const { t } = useI18n()
  return (
    <FileContentPreview>
      {content => {
        const url = parseDotUrl(content) ?? ''

        return (
          <div>
            <PreviewContainer>
              <pre className="scroll-thin overflow-x-auto font-mono text-control">{content}</pre>
            </PreviewContainer>
            <DownloadFooter>
              <DownloadButton
                onClickCallback={() => window.open(url)}
                btnText={t('Open URL')}
                btnIcon={ExternalLink}
              />
            </DownloadFooter>
          </div>
        )
      }}
    </FileContentPreview>
  )
}

export default URLPreview
