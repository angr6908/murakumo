import { type FC, useEffect, useRef, useState } from 'react'
import { ReactReader } from 'react-reader'
import type { OdFileObject } from '../../types'
import { directFileUrl } from '../../utils/odUrls'
import { useCurrentPathToken } from '../../utils/useCurrentPathToken'
import Loading from '../Loading'
import { DownloadFooter } from './Containers'

const EPUBPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath, hashedToken } = useCurrentPathToken()

  const [epubContainerWidth, setEpubContainerWidth] = useState(400)
  const epubContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEpubContainerWidth(epubContainer.current?.offsetWidth ?? 400)
  }, [])

  const [location, setLocation] = useState<string | number | null>(null)
  const onLocationChange = (cfiStr: string) => setLocation(cfiStr)

  // Fix for not valid epub files according to
  // https://github.com/gerhardsletten/react-reader/issues/33#issuecomment-673964947
  const fixEpub = rendition => {
    const spineGet = rendition.book.spine.get.bind(rendition.book.spine)
    rendition.book.spine.get = (target: string) => {
      const targetStr = target as string
      let t = spineGet(target)
      while (t == null && targetStr.startsWith('../')) {
        target = targetStr.substring(3)
        t = spineGet(target)
      }
      return t
    }
  }

  return (
    <div>
      <div
        className="no-scrollbar flex w-full flex-col overflow-scroll rounded bg-white md:p-3 dark:bg-gray-900"
        style={{ maxHeight: '90vh' }}
      >
        <div className="no-scrollbar w-full flex-1 overflow-scroll" ref={epubContainer} style={{ minHeight: '70vh' }}>
          <div
            style={{
              position: 'absolute',
              width: epubContainerWidth,
              height: '70vh',
            }}
          >
            <ReactReader
              url={directFileUrl(file, asPath, hashedToken)}
              getRendition={fixEpub}
              loadingView={<Loading loadingText={'Loading EPUB ...'} />}
              location={location}
              locationChanged={onLocationChange}
              epubInitOptions={{ openAs: 'epub' }}
              epubOptions={{ flow: 'scrolled', allowPopups: true }}
            />
          </div>
        </div>
      </div>
      <DownloadFooter />
    </div>
  )
}

export default EPUBPreview
