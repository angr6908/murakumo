import { ExternalLink } from 'lucide-react'
import type { FC } from 'react'
import { useI18n } from '../../i18n'
import { DownloadButton } from '../DownloadBtnGtoup'
import TextPreview from './TextPreview'

const parseDotUrl = (content: string): string | undefined => {
  return content
    .split('\n')
    .find(line => line.startsWith('URL='))
    ?.split('=')[1]
}

const URLPreview: FC = () => {
  const { t } = useI18n()
  return (
    <TextPreview
      footer={content => (
        <DownloadButton
          onClickCallback={() => window.open(parseDotUrl(content) ?? '')}
          btnText={t('Open URL')}
          btnIcon={ExternalLink}
        />
      )}
    />
  )
}

export default URLPreview
