import type { OdFileObject } from '../../types'
import { getBaseUrl } from '../../utils/getBaseUrl'
import { directFileUrl } from '../../utils/odUrls'
import { useCurrentPathToken } from '../../utils/useCurrentPathToken'
import { DownloadFooter } from './Containers'

const PDFPreview: React.FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath, hashedToken } = useCurrentPathToken()

  const pdfPath = encodeURIComponent(directFileUrl(file, asPath, hashedToken, getBaseUrl()))
  const url = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${pdfPath}`

  return (
    <div>
      <div className="w-full overflow-hidden rounded" style={{ height: '90vh' }}>
        <iframe src={url} frameBorder="0" width="100%" height="100%"></iframe>
      </div>
      <DownloadFooter />
    </div>
  )
}

export default PDFPreview
