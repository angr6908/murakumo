import type { NextApiRequest, NextApiResponse } from 'next'
import {
  driveItemUrl,
  graphHeaders,
  requireAccessToken,
  sendDriveError,
  setDefaultCacheControl,
} from '../../utils/apiRoute'
import { encodeSegments } from '../../utils/drivePath'
import { get } from '../../utils/http'
import { isProtectedPath } from '../../utils/onedriveApi'
import siteConfig from '../../utils/siteConfig'

function sanitizeQuery(query: string): string {
  return encodeURIComponent(
    query.replace(/'/g, "''").replace(/</g, ' &lt; ').replace(/>/g, ' &gt; ').replace(/[?/]/g, ' '),
  )
}

/**
 * Graph `parentReference.path` looks like `/drives/{driveId}/root:/Base/sub`, and `Base` is the
 * configured base directory. Split on that anchor (or `root:` when the base is the drive root) to
 * recover the app's slash path, then encode each segment — the same mapping the folder listing
 * uses, done once here so the client doesn't re-derive it per result.
 */
function parentReferenceToAppPath(path: string): string {
  const anchor = siteConfig.baseDirectory === '/' ? 'root:' : siteConfig.baseDirectory
  const [, absolutePath = ''] = path.split(anchor)
  return absolutePath ? encodeSegments(absolutePath.split('/').map(decodeURIComponent)) : ''
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { q: searchQuery = '' } = req.query

  setDefaultCacheControl(res)

  if (typeof searchQuery !== 'string') {
    res.status(200).json([])
    return
  }

  const cleanQuery = searchQuery.trim()
  if (!cleanQuery) {
    res.status(200).json([])
    return
  }

  const accessToken = await requireAccessToken(res)
  if (!accessToken) return

  const searchApi = driveItemUrl('/', `/search(q='${sanitizeQuery(cleanQuery)}')`)

  try {
    const { data } = await get(searchApi, {
      headers: graphHeaders(accessToken),
      params: {
        $select: 'id,name,file,folder,parentReference',
        $top: siteConfig.maxItems,
      },
    })
    const items = (data.value ?? []).flatMap((item: any) => {
      if (typeof item.parentReference?.path !== 'string') return []
      const parentPath = parentReferenceToAppPath(item.parentReference.path)
      if (isProtectedPath(parentPath.split('/').map(decodeURIComponent).join('/'))) return []
      return [{ ...item, path: `${parentPath}/${encodeURIComponent(item.name)}` }]
    })
    res.status(200).json(items)
  } catch (error: any) {
    sendDriveError(res, error)
  }
}
