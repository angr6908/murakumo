import type { NextApiRequest, NextApiResponse } from 'next'

import { authorizePath, handleCors, sendDriveError } from '../../utils/apiRoute'
import { isNotPersonalVaultItem } from '../../utils/drivePath'
import { isHttpError } from '../../utils/http'
import { revealObfuscatedToken } from '../../utils/oAuthHandler'
import { storeOdAuthTokens } from '../../utils/odAuthTokenStore'
import { driveItemUrl, encodePath, graphGet } from '../../utils/onedriveApi'
import siteConfig from '../../utils/siteConfig'

const driveItemSelect = 'name,size,id,lastModifiedDateTime,folder,file,video,image'
const fileItemSelect = `${driveItemSelect},@microsoft.graph.downloadUrl`
const shouldFallbackToIdentity = (error: unknown) =>
  isHttpError(error) && (error.response.status === 400 || error.response.status === 404)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { obfuscatedAccessToken, accessTokenExpiry, obfuscatedRefreshToken } = req.body
    await storeOdAuthTokens({
      accessToken: revealObfuscatedToken(obfuscatedAccessToken),
      accessTokenExpiry,
      refreshToken: revealObfuscatedToken(obfuscatedRefreshToken),
    })
    res.status(200).send('OK')
    return
  }

  const { raw = false, next = '', sort = '' } = req.query
  if (raw && handleCors(req, res)) return

  if (typeof sort !== 'string') {
    res.status(400).json({ error: 'Sort query invalid.' })
    return
  }

  const authorized = await authorizePath(req, res)
  if (!authorized) return
  const { path, accessToken } = authorized

  try {
    if (raw) {
      res.setHeader('Cache-Control', 'no-cache')
      const data = await graphGet(driveItemUrl(path), accessToken, { select: 'id,@microsoft.graph.downloadUrl' })
      if ('@microsoft.graph.downloadUrl' in data) res.redirect(data['@microsoft.graph.downloadUrl'])
      else res.status(404).json({ error: 'No download url found.' })
      return
    }

    const sendFolder = async () => {
      const folder = await graphGet(driveItemUrl(path, '/children'), accessToken, {
        select: driveItemSelect,
        $top: siteConfig.maxItems,
        $skipToken: next || undefined,
        $orderby: sort || undefined,
      })
      if (encodePath(path) === '' && Array.isArray(folder.value)) {
        folder.value = folder.value.filter(isNotPersonalVaultItem)
      }
      const nextPage = folder['@odata.nextLink']?.match(/&\$skiptoken=(.+)/i)?.[1]
      res.status(200).json({ folder, ...(nextPage ? { next: nextPage } : {}) })
    }

    if (next) return await sendFolder()

    if (!/\.[^/.]+$/.test(path)) {
      try {
        return await sendFolder()
      } catch (error) {
        if (!shouldFallbackToIdentity(error)) throw error
      }
    }

    const item = await graphGet(driveItemUrl(path), accessToken, { select: fileItemSelect })
    if ('folder' in item) return await sendFolder()
    res.status(200).json({ file: item })
  } catch (error) {
    sendDriveError(res, error)
  }
}
