import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'
import apiConfig from '../../utils/apiConfig'
import { graphHeaders, requireAccessToken, sendDriveError } from '../../utils/apiRoute'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id = '' } = req.query

  res.setHeader('Cache-Control', apiConfig.cacheControlHeader)

  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Invalid driveItem ID.' })
    return
  }

  const accessToken = await requireAccessToken(res)
  if (!accessToken) return

  try {
    const { data } = await axios.get(`${apiConfig.driveApi}/items/${id}`, {
      headers: graphHeaders(accessToken),
      params: { select: 'id,name,parentReference' },
    })
    res.status(200).json(data)
  } catch (error: any) {
    sendDriveError(res, error)
  }
  return
}
