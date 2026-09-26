import type { NextApiRequest, NextApiResponse } from 'next'

import {
  driveItemUrl,
  graphHeaders,
  normalisePathQuery,
  requireAccessToken,
  sendDriveError,
  setDefaultCacheControl,
  verifyProtectedPath,
} from '../../utils/apiRoute'
import { get } from '../../utils/http'
import { probeMp4 } from '../../utils/mp4'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path = '/', odpt = '', v } = req.query

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

  try {
    const { data } = await get(driveItemUrl(pathQuery.path), {
      headers: graphHeaders(accessToken),
      params: { select: 'id,@microsoft.graph.downloadUrl' },
    })
    const downloadUrl = data['@microsoft.graph.downloadUrl']
    if (!downloadUrl) {
      res.status(404).json({ error: 'No download url found.' })
      return
    }

    const probe = await probeMp4(downloadUrl).catch(() => null)
    if (v && !res.getHeader('Cache-Control')) {
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=31536000, stale-while-revalidate')
    }
    setDefaultCacheControl(res)
    res.status(200).json(probe ?? { tracks: [] })
  } catch (error: any) {
    sendDriveError(res, error)
  }
}
