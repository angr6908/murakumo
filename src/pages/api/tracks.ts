import type { NextApiRequest, NextApiResponse } from 'next'

import { authorizePath, sendDriveError } from '../../utils/apiRoute'
import { probeMp4 } from '../../utils/mp4'
import { driveItemUrl, graphGet } from '../../utils/onedriveApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authorized = await authorizePath(req, res)
  if (!authorized) return

  try {
    const data = await graphGet(driveItemUrl(authorized.path), authorized.accessToken, {
      select: 'id,@microsoft.graph.downloadUrl',
    })
    const downloadUrl = data['@microsoft.graph.downloadUrl']
    if (!downloadUrl) {
      res.status(404).json({ error: 'No download url found.' })
      return
    }

    const probe = await probeMp4(downloadUrl).catch(() => null)
    if (req.query.v && probe && res.getHeader('Cache-Control') !== 'no-cache') {
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable')
    }
    res.status(200).json(probe ?? { tracks: [] })
  } catch (error) {
    sendDriveError(res, error)
  }
}
