import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'

import apiConfig from '../../utils/apiConfig'
import {
  graphHeaders,
  nextPageToken,
  normalisePathQuery,
  requireAccessToken,
  sendDriveError,
  verifyProtectedPath,
} from '../../utils/apiRoute'
import { isNotPersonalVaultItem } from '../../utils/drivePath'
import { revealObfuscatedToken } from '../../utils/oAuthHandler'
import { storeOdAuthTokens } from '../../utils/odAuthTokenStore'
import { encodePath, runCorsMiddleware } from '../../utils/onedriveApi'
import siteConfig from '../../utils/siteConfig'

const driveItemSelect = 'name,size,id,lastModifiedDateTime,folder,file,video,image'
const fileItemSelect = `${driveItemSelect},@microsoft.graph.downloadUrl`
const isLikelyFilePath = (path: string) => /\.[^/.]+$/.test(path.split('/').pop() ?? '')
const shouldFallbackToIdentity = (error: unknown) => {
  if (!axios.isAxiosError(error)) return false
  return error.response?.status === 400 || error.response?.status === 404
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { obfuscatedAccessToken, accessTokenExpiry, obfuscatedRefreshToken } = req.body
    const accessToken = revealObfuscatedToken(obfuscatedAccessToken)
    const refreshToken = revealObfuscatedToken(obfuscatedRefreshToken)

    if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
      res.status(400).send('Invalid request body')
      return
    }

    await storeOdAuthTokens({ accessToken, accessTokenExpiry, refreshToken })
    res.status(200).send('OK')
    return
  }

  const { path = '/', raw = false, next = '', sort = '' } = req.query

  res.setHeader('Cache-Control', apiConfig.cacheControlHeader)

  const pathQuery = normalisePathQuery(path, { trimTrailingSlash: true })
  if ('error' in pathQuery) {
    res.status(400).json({ error: pathQuery.error })
    return
  }

  if (typeof sort !== 'string') {
    res.status(400).json({ error: 'Sort query invalid.' })
    return
  }

  const accessToken = await requireAccessToken(res)
  if (!accessToken) return

  const cleanPath = pathQuery.path
  const hasAccess = await verifyProtectedPath(res, cleanPath, accessToken, req.headers['od-protected-token'] as string)
  if (!hasAccess) return

  const requestPath = encodePath(cleanPath)
  const requestUrl = `${apiConfig.driveApi}/root${requestPath}`
  const isRoot = requestPath === ''
  const childrenUrl = `${requestUrl}${isRoot ? '' : ':'}/children`

  const fetchFolderData = async () => {
    const { data } = await axios.get(childrenUrl, {
      headers: graphHeaders(accessToken),
      params: {
        select: driveItemSelect,
        $top: siteConfig.maxItems,
        ...(next ? { $skipToken: next } : {}),
        ...(sort ? { $orderby: sort } : {}),
      },
    })

    return data
  }

  const sendFolderData = (folderData: any) => {
    const nextPage = nextPageToken(folderData['@odata.nextLink'])
    const visibleFolderData =
      isRoot && Array.isArray(folderData.value)
        ? { ...folderData, value: folderData.value.filter(isNotPersonalVaultItem) }
        : folderData
    res.status(200).json({ folder: visibleFolderData, ...(nextPage ? { next: nextPage } : {}) })
  }

  if (raw) {
    await runCorsMiddleware(req, res)
    res.setHeader('Cache-Control', 'no-cache')

    const { data } = await axios.get(requestUrl, {
      headers: graphHeaders(accessToken),
      params: { select: 'id,@microsoft.graph.downloadUrl' },
    })

    if ('@microsoft.graph.downloadUrl' in data) {
      res.redirect(data['@microsoft.graph.downloadUrl'])
    } else {
      res.status(404).json({ error: 'No download url found.' })
    }
    return
  }

  try {
    if (next) {
      sendFolderData(await fetchFolderData())
      return
    }

    if (!isLikelyFilePath(cleanPath)) {
      try {
        sendFolderData(await fetchFolderData())
        return
      } catch (error) {
        if (!shouldFallbackToIdentity(error)) throw error
      }
    }

    const { data: identityData } = await axios.get(requestUrl, {
      headers: graphHeaders(accessToken),
      params: { select: fileItemSelect },
    })

    if ('folder' in identityData) {
      sendFolderData(await fetchFolderData())
      return
    }
    res.status(200).json({ file: identityData })
    return
  } catch (error: any) {
    sendDriveError(res, error)
    return
  }
}
