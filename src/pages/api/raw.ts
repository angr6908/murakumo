import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import type { NextApiRequest, NextApiResponse } from 'next'

import { authorizePath, handleCors, sendDriveError } from '../../utils/apiRoute'
import { getStream } from '../../utils/http'
import { driveItemUrl, graphGet } from '../../utils/onedriveApi'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (handleCors(req, res)) return

  const authorized = await authorizePath(req, res)
  if (!authorized) return

  try {
    const data = await graphGet(driveItemUrl(authorized.path), authorized.accessToken, {
      select: 'id,size,@microsoft.graph.downloadUrl',
    })

    const downloadUrl = data['@microsoft.graph.downloadUrl']
    if (!downloadUrl) {
      res.status(404).json({ error: 'No download url found.' })
      return
    }

    const { proxy } = req.query
    if ((proxy === 'true' || proxy === '1') && data.size < 4 << 20) {
      const { headers, data: stream } = await getStream(downloadUrl)
      res.writeHead(200, { ...Object.fromEntries(headers), 'Cache-Control': String(res.getHeader('Cache-Control')) })
      await pipeline(Readable.fromWeb(stream as NodeReadableStream), res).catch(() => {})
      return
    }

    res.redirect(downloadUrl)
  } catch (error) {
    sendDriveError(res, error)
  }
}
