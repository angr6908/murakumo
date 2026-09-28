/**
 * Bun-native HTTP client built on the standard `fetch` Web API (the same API the
 * browser exposes), replacing `axios`. Every request goes through the platform
 * primitives bundler-compatible in both Bun and the browser, so this module is safe
 * to import from client and server code alike.
 *
 * It mirrors the small slice of `axios`'s surface Murakumo relies on:
 *   - `get(url, { headers, params })`              -> `{ data }`
 *   - `post(url, body, { headers })`               -> `{ data }`
 *   - `getStream(url, { headers })`                -> `{ data: ReadableStream, headers }`
 *   - `isHttpError(error)` and `error.response`    -> `{ status, data }`
 */

type HttpError = {
  response: {
    status: number
    data: unknown
  }
}

export const isHttpError = (error: unknown): error is HttpError =>
  typeof error === 'object' &&
  error !== null &&
  'response' in error &&
  typeof (error as HttpError).response?.status === 'number'

export type QueryParams = Record<string, string | number | string[] | undefined>

const buildUrl = (url: string, params: QueryParams = {}): string => {
  const query = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      value === undefined ? [] : [value].flat().map(item => [key, String(item)]),
    ),
  ).toString()
  return query ? `${url}${url.includes('?') ? '&' : '?'}${query}` : url
}

const readBody = async (response: Response): Promise<any> => {
  const text = await response.text().catch(() => null)
  try {
    return text && JSON.parse(text)
  } catch {
    return text
  }
}

async function send(url: string, init: RequestInit): Promise<{ data: any }> {
  const response = await fetch(url, init)
  const data = await readBody(response)
  if (!response.ok) throw { response: { status: response.status, data } } satisfies HttpError
  return { data }
}

/**
 * Perform a GET and parse the JSON body. Throws an `HttpError` (with `.response`)
 * on non-2xx so callers can read `error.response.status` / `.data`, matching axios.
 */
export function get(url: string, { headers, params }: { headers?: Record<string, string>; params?: QueryParams } = {}) {
  return send(buildUrl(url, params), { headers })
}

/**
 * Perform a POST. `body` may be a `URLSearchParams` or a JSON-serialisable object.
 * Throws an `HttpError` on non-2xx.
 */
export function post(
  url: string,
  body: URLSearchParams | Record<string, unknown>,
  { headers }: { headers?: Record<string, string> } = {},
) {
  return body instanceof URLSearchParams
    ? send(url, { method: 'POST', headers, body })
    : send(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })
}

/**
 * Perform a GET and return the response body as a `ReadableStream` for proxying.
 * Used by the raw file proxy instead of axios's `responseType: 'stream'`.
 * Throws an `HttpError` on non-2xx.
 */
export async function getStream(
  url: string,
  { headers }: { headers?: Record<string, string> } = {},
): Promise<{ data: ReadableStream; headers: Headers }> {
  const response = await fetch(url, { headers })
  if (!response.ok) throw { response: { status: response.status, data: await readBody(response) } } satisfies HttpError
  if (!response.body) throw new Error('Response has no body stream.')
  return { data: response.body, headers: response.headers }
}
