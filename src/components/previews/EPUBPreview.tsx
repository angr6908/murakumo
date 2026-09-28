import { type FC, useEffect, useRef, useState } from 'react'
import { type IReactReaderStyle, ReactReader, ReactReaderStyle } from 'react-reader'
import { useI18n } from '../../i18n'
import type { OdFileObject } from '../../types'
import { directFileUrl } from '../../utils/odUrls'
import { useCurrentPathToken } from '../../utils/useCurrentPathToken'
import Loading from '../Loading'
import { DownloadFooter } from './Containers'

const readerStyles: IReactReaderStyle = {
  ...ReactReaderStyle,
  readerArea: {
    ...ReactReaderStyle.readerArea,
    backgroundColor: 'var(--color-background)',
    transition: 'transform var(--duration-slower) var(--ease-out)',
  },
  titleArea: { ...ReactReaderStyle.titleArea, color: 'var(--color-muted-foreground)', fontSize: 'var(--text-control)' },
  arrow: {
    ...ReactReaderStyle.arrow,
    color: 'var(--color-muted-foreground)',
    fontFamily: 'inherit',
    fontSize: 48,
    marginTop: -24,
    transition: 'color var(--duration-base) var(--ease-out)',
  },
  arrowHover: { color: 'var(--color-foreground)' },
  tocArea: {
    ...ReactReaderStyle.tocArea,
    background: 'var(--color-well)',
    padding: 'var(--spacing)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'calc(var(--spacing) * 0.5)',
  },
  tocAreaButton: {
    ...ReactReaderStyle.tocAreaButton,
    fontFamily: 'inherit',
    fontSize: 'var(--text-control)',
    color: 'var(--color-foreground)',
    borderBottom: 'none',
    borderRadius: 'var(--radius-item)',
    padding: 'calc(var(--spacing) * 1.5) calc(var(--spacing) * 2)',
  },
  tocButton: { ...ReactReaderStyle.tocButton, width: 36, height: 36, top: 8, left: 8, borderRadius: 9999 },
  tocButtonExpanded: { background: 'var(--color-accent)' },
  tocButtonBar: {
    ...ReactReaderStyle.tocButtonBar,
    width: '44%',
    margin: '-1px -22%',
    background: 'var(--color-foreground)',
    borderRadius: 9999,
    transition: 'all var(--duration-slower) var(--ease-out)',
  },
  loadingView: { ...ReactReaderStyle.loadingView, color: 'var(--color-muted-foreground)' },
  errorView: { ...ReactReaderStyle.errorView, color: 'var(--color-danger)' },
}

const EPUBPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath, hashedToken } = useCurrentPathToken()
  const { t } = useI18n()

  const [epubContainerWidth, setEpubContainerWidth] = useState(400)
  const epubContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEpubContainerWidth(epubContainer.current?.offsetWidth ?? 400)
  }, [])

  const [location, setLocation] = useState<string | number | null>(null)

  // Fix for not valid epub files according to
  // https://github.com/gerhardsletten/react-reader/issues/33#issuecomment-673964947
  const fixEpub = rendition => {
    rendition.themes.override('color', getComputedStyle(epubContainer.current ?? document.body).color)
    const spineGet = rendition.book.spine.get.bind(rendition.book.spine)
    rendition.book.spine.get = (target: string) => {
      let t = spineGet(target)
      while (t == null && target.startsWith('../')) {
        target = target.substring(3)
        t = spineGet(target)
      }
      return t
    }
  }

  return (
    <div>
      <div
        className="surface no-scrollbar flex w-full flex-col overflow-scroll bg-background sm:rounded-popup md:p-3"
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
              readerStyles={readerStyles}
              loadingView={<Loading loadingText={t('Loading EPUB ...')} />}
              location={location}
              locationChanged={setLocation}
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
