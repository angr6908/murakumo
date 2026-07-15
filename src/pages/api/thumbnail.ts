import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { OdThumbnail } from '../../types'
import apiConfig from '../../utils/apiConfig'
import {
  graphHeaders,
  normalisePathQuery,
  requireAccessToken,
  sendDriveError,
  verifyProtectedPath,
} from '../../utils/apiRoute'
import { encodePath } from '../../utils/onedriveApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const accessToken = await requireAccessToken(res)
  if (!accessToken) return

  const { path = '', size = 'medium', odpt = '' } = req.query

  if (odpt === '') res.setHeader('Cache-Control', apiConfig.cacheControlHeader)

  if (size !== 'large' && size !== 'medium' && size !== 'small') {
    res.status(400).json({ error: 'Invalid size' })
    return
  }
  const pathQuery = normalisePathQuery(path)
  if ('error' in pathQuery) {
    res.status(400).json({ error: pathQuery.error })
    return
  }

  const hasAccess = await verifyProtectedPath(res, pathQuery.path, accessToken, odpt as string)
  if (!hasAccess) return

  const requestPath = encodePath(pathQuery.path)
  const isRoot = requestPath === ''

  try {
    const { data } = await axios.get(`${apiConfig.driveApi}/root${requestPath}${isRoot ? '' : ':'}/thumbnails`, {
      headers: graphHeaders(accessToken),
    })

    const thumbnailUrl = data.value && data.value.length > 0 ? (data.value[0] as OdThumbnail)[size].url : null
    if (thumbnailUrl) {
      res.redirect(thumbnailUrl)
    } else {
      res.status(400).json({ error: "The item doesn't have a valid thumbnail." })
    }
  } catch (error: any) {
    sendDriveError(res, error)
  }
  return
}
