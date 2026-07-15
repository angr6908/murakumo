import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import type { FC } from 'react'
import useSystemTheme from 'react-use-system-theme'

import useFileContent from '../../utils/fetchOnMount'
import { getLanguageByFileName } from '../../utils/getPreviewType'
import { rawFileUrl } from '../../utils/odUrls'
import DownloadButtonGroup from '../DownloadBtnGtoup'
import FourOhFour from '../FourOhFour'
import Loading from '../Loading'
import { DownloadBtnContainer, PreviewContainer } from './Containers'

const SyntaxHighlighter = dynamic(() => import('./SyntaxHighlighter'), { ssr: false })

const CodePreview: FC<{ file: any }> = ({ file }) => {
  const { asPath } = useRouter()
  const { response: content, error, validating } = useFileContent(rawFileUrl(asPath, null, '', true), asPath)

  const theme = useSystemTheme('dark')

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
        <DownloadBtnContainer>
          <DownloadButtonGroup />
        </DownloadBtnContainer>
      </>
    )
  }

  return (
    <>
      <PreviewContainer>
        <SyntaxHighlighter
          language={getLanguageByFileName(file.name)}
          styleName={theme === 'dark' ? 'tomorrowNightEighties' : 'tomorrow'}
        >
          {content}
        </SyntaxHighlighter>
      </PreviewContainer>
      <DownloadBtnContainer>
        <DownloadButtonGroup />
      </DownloadBtnContainer>
    </>
  )
}

export default CodePreview
