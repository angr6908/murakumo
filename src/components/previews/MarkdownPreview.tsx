import dynamic from 'next/dynamic'
import type { FC } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import 'katex/dist/katex.min.css'

import useFileContent from '../../utils/fetchOnMount'
import { rawFileUrl } from '../../utils/odUrls'
import DownloadButtonGroup from '../DownloadBtnGtoup'
import FourOhFour from '../FourOhFour'
import Loading from '../Loading'
import { DownloadBtnContainer, PreviewContainer } from './Containers'

const SyntaxHighlighter = dynamic(() => import('./SyntaxHighlighter'), { ssr: false })

const MarkdownPreview: FC<{
  file: any
  path: string
  standalone?: boolean
}> = ({ file, path, standalone = true }) => {
  // The parent folder of the markdown file, which is also the relative image folder
  const parentPath = standalone ? path.substring(0, path.lastIndexOf('/')) : path

  const {
    response: content,
    error,
    validating,
  } = useFileContent(rawFileUrl(`${parentPath}/${file.name}`, null, '', true), path)

  // Check if the image is relative path instead of a absolute url
  const isUrlAbsolute = (url: string | string[]) => url.indexOf('://') > 0 || url.indexOf('//') === 0
  // Custom renderer:
  const customRenderer = {
    // img: to render images in markdown with relative file paths
    img: (props: any) => {
      const { alt, src, title, width, height, style } = props
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={alt}
          src={isUrlAbsolute(src as string) ? src : `/api/?path=${parentPath}/${src}&raw=true`}
          title={title}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          style={style}
        />
      )
    },
    // code: to render code blocks with react-syntax-highlighter
    code(props: any) {
      const { className, children, ...rest } = props
      const match = /language-(\w+)/.exec(className || '')
      if (!match) {
        return (
          <code className={className} {...rest}>
            {children}
          </code>
        )
      }

      return (
        <SyntaxHighlighter language={match[1]} styleName="tomorrowNight" preTag="div" {...rest}>
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      )
    },
  }

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
        {standalone && (
          <DownloadBtnContainer>
            <DownloadButtonGroup />
          </DownloadBtnContainer>
        )}
      </>
    )
  }

  return (
    <div>
      <PreviewContainer>
        <div className="markdown-body">
          {/* Using rehypeRaw to render HTML inside Markdown is potentially dangerous, use under safe environments. (#18) */}
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeRaw]}
            components={customRenderer}
          >
            {content}
          </ReactMarkdown>
        </div>
      </PreviewContainer>
      {standalone && (
        <DownloadBtnContainer>
          <DownloadButtonGroup />
        </DownloadBtnContainer>
      )}
    </div>
  )
}

export default MarkdownPreview
