import dynamic from 'next/dynamic'
import { type FC, memo, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import 'katex/dist/katex.min.css'

import type { OdDriveItemBase } from '../../types'
import { dirname } from '../../utils/drivePath'
import useFileContent from '../../utils/fetchOnMount'
import { rawFileUrl } from '../../utils/odUrls'
import { getStoredToken } from '../../utils/protectedRouteHandler'
import FourOhFour from '../FourOhFour'
import Loading from '../Loading'
import { DownloadFooter, PreviewContainer } from './Containers'

const SyntaxHighlighter = dynamic(() => import('./SyntaxHighlighter'), { ssr: false })

// Stable identities — react-markdown rebuilds its processor whenever these change.
const remarkPlugins = [remarkGfm, remarkMath]
const rehypePlugins = [rehypeKatex, rehypeRaw]

// Check if the image is a relative path instead of an absolute url
const isUrlAbsolute = (url: string) => url.indexOf('://') > 0 || url.indexOf('//') === 0

// code: to render code blocks with react-syntax-highlighter
const codeRenderer = (props: any) => {
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
}

const MarkdownPreview: FC<{
  file: OdDriveItemBase
  path: string
  standalone?: boolean
}> = ({ file, path, standalone = true }) => {
  // The parent folder of the markdown file, which is also the relative image folder
  const parentPath = standalone ? dirname(path) : path

  const {
    response: content,
    error,
    validating,
  } = useFileContent(rawFileUrl(`${parentPath}/${file.name}`, null, '', true), path)

  const customRenderer = useMemo(() => {
    const hashedToken = getStoredToken(parentPath)

    return {
      // img: to render images in markdown with relative file paths
      img: (props: any) => {
        const { alt, src, title, width, height, style } = props
        return (
          // biome-ignore lint/performance/noImgElement: src comes from arbitrary user markdown, so it cannot be constrained to next/image
          <img
            alt={alt}
            src={isUrlAbsolute(src as string) ? src : rawFileUrl(`${parentPath}/${src}`, hashedToken)}
            title={title}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
            style={style}
          />
        )
      },
      code: codeRenderer,
    }
  }, [parentPath])

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
        {standalone && <DownloadFooter />}
      </>
    )
  }

  return (
    <div>
      <PreviewContainer>
        <div className="markdown-body">
          {/* Using rehypeRaw to render HTML inside Markdown is potentially dangerous, use under safe environments. (#18) */}
          <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={customRenderer}>
            {content}
          </ReactMarkdown>
        </div>
      </PreviewContainer>
      {standalone && <DownloadFooter />}
    </div>
  )
}

// The README is re-rendered by every FileListing state change (selection, download progress),
// and react-markdown re-parses the whole document on each render.
export default memo(MarkdownPreview)
