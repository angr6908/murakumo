import type { ReactNode } from 'react'
import { useI18n } from '../../i18n'
import useFileContent from '../../utils/fetchOnMount'
import { rawFileUrl } from '../../utils/odUrls'
import { useCurrentPathToken } from '../../utils/useCurrentPathToken'
import FourOhFour from '../FourOhFour'
import Loading from '../Loading'
import { DownloadFooter, PreviewContainer } from './Containers'

/**
 * Fetches the current file's text content and owns the error / loading / empty states that every
 * text-based preview shares, handing the loaded content to `children`.
 */
export default function FileContentPreview({
  path,
  standalone = true,
  footer,
  children,
}: {
  path?: string
  /** When embedded in a listing (e.g. a README), skip the sticky footer. */
  standalone?: boolean
  footer?: (content: string) => ReactNode
  children: (content: string) => ReactNode
}) {
  const { asPath, hashedToken } = useCurrentPathToken()
  const { t } = useI18n()
  const { response: content, error, validating } = useFileContent(rawFileUrl(path ?? asPath, hashedToken, '', true))

  if (error) {
    return (
      <PreviewContainer>
        <FourOhFour errorMsg={error} />
      </PreviewContainer>
    )
  }

  const loaded = !validating && content !== ''
  return (
    <div>
      <PreviewContainer>
        {validating ? (
          <Loading loadingText={t('Loading file content...')} />
        ) : loaded ? (
          children(content)
        ) : (
          <FourOhFour errorMsg={t('File is empty.')} />
        )}
      </PreviewContainer>
      {standalone && <DownloadFooter>{loaded && footer?.(content)}</DownloadFooter>}
    </div>
  )
}
