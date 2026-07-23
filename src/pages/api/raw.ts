import type { OutgoingHttpHeaders } from 'node:http'
import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'

import apiConfig from '../../utils/apiConfig'
import {
  driveItemUrl,
  graphHeaders,
  normalisePathQuery,
  requireAccessToken,
  sendDriveError,
  verifyProtectedPath,
} from '../../utils/apiRoute'
import { runCorsMiddleware } from '../../utils/onedriveApi'

const shouldProxyFile = (proxy: NextApiRequest['query'][string]) => proxy === 'true' || proxy === '1'
const toOutgoingHeaders = (
  headers: Record<string, unknown>,
  cacheControl: ReturnType<NextApiResponse['getHeader']>,
): OutgoingHttpHeaders => ({
  ...Object.fromEntries(
    Object.entries(headers).filter(([, v]) => typeof v === 'number' || typeof v === 'string' || Array.isArray(v)),
  ),
  'Cache-Control': cacheControl,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path = '/', odpt = '', proxy } = req.query

  const pathQuery = normalisePathQuery(path)
  if ('error' in pathQuery) {
    res.status(400).json({ error: pathQuery.error })
    return
  }

  const accessToken = await requireAccessToken(res)
  if (!accessToken) return

  const odTokenHeader = (req.headers['od-protected-token'] as string) ?? odpt
  const hasAccess = await verifyProtectedPath(res, pathQuery.path, accessToken, odTokenHeader as string)
  if (!hasAccess) return
  const responseCacheControl = res.getHeader('Cache-Control') ?? apiConfig.cacheControlHeader

  await runCorsMiddleware(req, res)
  try {
    const { data } = await axios.get(driveItemUrl(pathQuery.path), {
      headers: graphHeaders(accessToken),
      params: { select: 'id,size,@microsoft.graph.downloadUrl' },
    })

    const downloadUrl = data['@microsoft.graph.downloadUrl']
    if (!downloadUrl) {
      res.status(404).json({ error: 'No download url found.' })
      return
    }

    if (shouldProxyFile(proxy) && 'size' in data && data.size < 4194304) {
      const { headers, data: stream } = await axios.get(downloadUrl as string, { responseType: 'stream' })
      res.writeHead(200, toOutgoingHeaders(headers, responseCacheControl))
      stream.pipe(res)
      return
    }

    res.setHeader('Cache-Control', responseCacheControl)
    res.redirect(downloadUrl)
    return
  } catch (error: any) {
    sendDriveError(res, error)
    return
  }
}
