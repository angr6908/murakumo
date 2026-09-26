import type { FC } from 'react'
import type { OdFileObject } from '../../types'
import { directFileUrl } from '../../utils/odUrls'
import { useCurrentPathToken } from '../../utils/useCurrentPathToken'
import { DownloadFooter, PreviewContainer } from './Containers'

const ImagePreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath, hashedToken } = useCurrentPathToken()

  return (
    <>
      <PreviewContainer>
        <img
          className="mx-auto"
          src={directFileUrl(file, asPath, hashedToken)}
          alt={file.name}
          width={file.image?.width}
          height={file.image?.height}
          decoding="async"
        />
      </PreviewContainer>
      <DownloadFooter />
    </>
  )
}

export default ImagePreview
