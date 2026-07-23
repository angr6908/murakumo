import type { ReactElement } from 'react'
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
  children,
}: {
  url?: string
  children: (content: string) => ReactElement
}) {
  const { asPath } = useCurrentPathToken()
  const { response: content, error, validating } = useFileContent(url ?? rawFileUrl(asPath, null, '', true), asPath)

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
          <Loading loadingText={'Loading file content...'} />
        </PreviewContainer>
        <DownloadFooter />
      </>
    )
  }

  if (!content) {
    return (
      <>
        <PreviewContainer>
          <FourOhFour errorMsg={'File is empty.'} />
        </PreviewContainer>
        <DownloadFooter />
      </>
    )
  }

  return children(content)
}
