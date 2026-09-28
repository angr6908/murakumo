import type { NextApiRequest, NextApiResponse } from 'next'

import { authorizePath, sendDriveError } from '../../utils/apiRoute'
import { driveItemUrl, graphGet } from '../../utils/onedriveApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { size = 'medium' } = req.query
  if (size !== 'large' && size !== 'medium' && size !== 'small') {
    res.status(400).json({ error: 'Invalid size' })
    return
  }

  const authorized = await authorizePath(req, res)
  if (!authorized) return

  try {
    const data = await graphGet(driveItemUrl(authorized.path, '/thumbnails'), authorized.accessToken)
    const thumbnailUrl: string | undefined = data.value?.[0]?.[size]?.url
    if (thumbnailUrl) res.redirect(thumbnailUrl)
    else res.status(400).json({ error: "The item doesn't have a valid thumbnail." })
  } catch (error) {
    sendDriveError(res, error)
  }
}
