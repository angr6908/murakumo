import type { FC } from 'react'
import type { OdFileObject } from '../../types'
import { getBaseUrl } from '../../utils/getBaseUrl'
import { directFileUrl } from '../../utils/odUrls'
import { useCurrentPathToken } from '../../utils/useCurrentPathToken'
import { DownloadFooter } from './Containers'

const OfficePreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath, hashedToken } = useCurrentPathToken()
  const docUrl = encodeURIComponent(directFileUrl(file, asPath, hashedToken, getBaseUrl()))

  return (
    <div>
      <div className="surface scroll-thin overflow-auto sm:rounded-popup" style={{ maxHeight: '90vh' }}>
        <iframe
          src={`https://view.officeapps.live.com/op/embed.aspx?src=${docUrl}`}
          width="100%"
          height="600"
          frameBorder="0"
        />
      </div>
      <DownloadFooter />
    </div>
  )
}

export default OfficePreview
