import { useRouter } from 'next/router'
import Preview from 'preview-office-docs'
import { type FC, useEffect, useRef, useState } from 'react'
import type { OdFileObject } from '../../types'
import { getBaseUrl } from '../../utils/getBaseUrl'
import { directFileUrl } from '../../utils/odUrls'
import { getStoredToken } from '../../utils/protectedRouteHandler'
import DownloadButtonGroup from '../DownloadBtnGtoup'
import { DownloadBtnContainer } from './Containers'

const OfficePreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath } = useRouter()
  const hashedToken = getStoredToken(asPath)

  const docContainer = useRef<HTMLDivElement>(null)
  const [docContainerWidth, setDocContainerWidth] = useState(600)

  const docUrl = encodeURIComponent(directFileUrl(file, asPath, hashedToken, getBaseUrl()))

  useEffect(() => {
    setDocContainerWidth(docContainer.current?.offsetWidth ?? 600)
  }, [])

  return (
    <div>
      <div className="overflow-scroll" ref={docContainer} style={{ maxHeight: '90vh' }}>
        <Preview url={docUrl} width={docContainerWidth.toString()} height="600" />
      </div>
      <DownloadBtnContainer>
        <DownloadButtonGroup />
      </DownloadBtnContainer>
    </div>
  )
}

export default OfficePreview
