import type { ReactElement } from 'react'
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
  url,
  standalone = true,
  children,
}: {
  url?: string
  /** When embedded in a listing (e.g. a README), skip the sticky footer. */
  standalone?: boolean
  children: (content: string) => ReactElement
}) {
  const { asPath } = useCurrentPathToken()
  const { t } = useI18n()
  const { response: content, error, validating } = useFileContent(url ?? rawFileUrl(asPath, null, '', true), asPath)

  const footer = standalone ? <DownloadFooter /> : null

  if (error) {
    return (
      <PreviewContainer>
        <FourOhFour errorMsg={error} />
      </PreviewContainer>
    )
  }

  if (validating) {
    return (
      <>
        <PreviewContainer>
          <Loading loadingText={t('Loading file content...')} />
        </PreviewContainer>
        {footer}
      </>
    )
  }

  if (!content) {
    return (
      <>
        <PreviewContainer>
          <FourOhFour errorMsg={t('File is empty.')} />
        </PreviewContainer>
        {footer}
      </>
    )
  }

  return children(content)
}
