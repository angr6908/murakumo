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
        {/* biome-ignore lint/performance/noImgElement: images.unoptimized is set in next.config.ts, so next/image adds no optimisation here, and the intrinsic size is only known at runtime */}
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
