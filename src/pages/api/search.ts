import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'
import apiConfig from '../../utils/apiConfig'
import { graphHeaders, requireAccessToken, sendDriveError } from '../../utils/apiRoute'
import { encodePath } from '../../utils/onedriveApi'
import siteConfig from '../../utils/siteConfig'

function sanitizeQuery(query: string): string {
  return encodeURIComponent(
    query.replace(/'/g, "''").replace(/</g, ' &lt; ').replace(/>/g, ' &gt; ').replace(/[?/]/g, ' '),
  )
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { q: searchQuery = '' } = req.query

  res.setHeader('Cache-Control', apiConfig.cacheControlHeader)

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

  const searchRootPath = encodePath('/')
  const encodedPath = searchRootPath === '' ? searchRootPath : `${searchRootPath}:`
  const searchApi = `${apiConfig.driveApi}/root${encodedPath}/search(q='${sanitizeQuery(cleanQuery)}')`

  try {
    const { data } = await axios.get(searchApi, {
      headers: graphHeaders(accessToken),
      params: {
        $select: 'id,name,file,folder,parentReference',
        $top: siteConfig.maxItems,
      },
    })
    res.status(200).json(data.value)
  } catch (error: any) {
    sendDriveError(res, error)
  }
}
