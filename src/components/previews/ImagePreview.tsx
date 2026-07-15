import { useRouter } from 'next/router'

import type { FC } from 'react'
import type { OdFileObject } from '../../types'
import { directFileUrl } from '../../utils/odUrls'
import { getStoredToken } from '../../utils/protectedRouteHandler'
import DownloadButtonGroup from '../DownloadBtnGtoup'
import { DownloadBtnContainer, PreviewContainer } from './Containers'

const ImagePreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath } = useRouter()
  const hashedToken = getStoredToken(asPath)

  return (
    <>
      <PreviewContainer>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="mx-auto"
          src={directFileUrl(file, asPath, hashedToken)}
          alt={file.name}
          width={file.image?.width}
          height={file.image?.height}
          decoding="async"
        />
      </PreviewContainer>
      <DownloadBtnContainer>
        <DownloadButtonGroup />
      </DownloadBtnContainer>
    </>
  )
}

export default ImagePreview
