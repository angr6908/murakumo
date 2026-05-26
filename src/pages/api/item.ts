import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'

import { graphHeaders, sendDriveError } from '../../utils/apiRoute'
import { getAccessToken } from '../../utils/onedriveApi'
import apiConfig from '../../utils/apiConfig'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const accessToken = await getAccessToken()
  const { id = '' } = req.query

  res.setHeader('Cache-Control', apiConfig.cacheControlHeader)

  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Invalid driveItem ID.' })
    return
  }

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
