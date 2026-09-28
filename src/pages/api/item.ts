import type { NextApiRequest, NextApiResponse } from 'next'
import apiConfig from '../../utils/apiConfig'
import { requireAccessToken, sendDriveError, setDefaultCacheControl } from '../../utils/apiRoute'
import { graphGet } from '../../utils/onedriveApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id = '' } = req.query

  setDefaultCacheControl(res)

  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Invalid driveItem ID.' })
    return
  }

  const accessToken = await requireAccessToken(res)
  if (!accessToken) return

  try {
    res.status(200).json(await graphGet(`${apiConfig.driveApi}/items/${id}`, accessToken, { select: 'id,name,parentReference' }))
  } catch (error) {
    sendDriveError(res, error)
  }
}
