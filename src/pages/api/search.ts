import type { NextApiRequest, NextApiResponse } from 'next'
import {
  driveItemUrl,
  graphHeaders,
  requireAccessToken,
  sendDriveError,
  setDefaultCacheControl,
} from '../../utils/apiRoute'
import { encodeSegments, isNotPersonalVaultItem } from '../../utils/drivePath'
import { get } from '../../utils/http'
import { isProtectedPath } from '../../utils/onedriveApi'
import { resolve } from '../../utils/posix'
import siteConfig from '../../utils/siteConfig'

function sanitizeQuery(query: string): string {
  return encodeURIComponent(
    query.replace(/'/g, "''").replace(/</g, ' &lt; ').replace(/>/g, ' &gt; ').replace(/[?/]/g, ' '),
  )
}

const maxSearchPages = 5
const basePath = resolve('/', siteConfig.baseDirectory).replace(/\/$/, '')
const driveRootPrefix = /^\/drives?\/(?:[^/]+\/)?root:/

function appParentPath(parentReferencePath: string): string | null {
  const prefix = driveRootPrefix.exec(parentReferencePath)
  if (!prefix) return null
  let absolutePath: string
  try {
    absolutePath = parentReferencePath.slice(prefix[0].length).split('/').map(decodeURIComponent).join('/')
  } catch {
    return null
  }
  if (!basePath) return absolutePath
  const lowerPath = absolutePath.toLowerCase()
  const lowerBase = basePath.toLowerCase()
  if (lowerPath === lowerBase) return ''
  return lowerPath.startsWith(`${lowerBase}/`) ? absolutePath.slice(basePath.length) : null
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
    const items: any[] = []
    let pageUrl: string | undefined = searchApi
    for (let page = 0; pageUrl && page < maxSearchPages && items.length < siteConfig.maxItems; page++) {
      const { data } = await get(pageUrl, {
        headers: graphHeaders(accessToken),
        params:
          page === 0 ? { $select: 'id,name,file,folder,parentReference', $top: siteConfig.maxItems } : undefined,
      })
      for (const item of data.value ?? []) {
        if (typeof item.parentReference?.path !== 'string') continue
        const parentPath = appParentPath(item.parentReference.path)
        if (parentPath === null || isProtectedPath(parentPath)) continue
        const segments = parentPath.split('/')
        if (!isNotPersonalVaultItem({ name: segments[1] ?? item.name })) continue
        items.push({ ...item, path: encodeSegments([...segments, item.name]) })
      }
      pageUrl = data['@odata.nextLink']
    }
    res.status(200).json(items.slice(0, siteConfig.maxItems))
  } catch (error: any) {
    sendDriveError(res, error)
  }
}
