// The single network choke point. Every API call goes through `apiFetch`, which
// always sends the httpOnly session cookie (`credentials: 'include'`, FR-A5 —
// no tokens in localStorage), prefixes the configured base URL, JSON-encodes the
// body, and turns any non-2xx response into a typed `ApiError` carrying the
// status and parsed body (so callers can surface BR-2 / BR-4 validation messages
// and route 401s to /login).

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    const detail =
      body && typeof body === 'object' && 'detail' in body
        ? String((body as { detail: unknown }).detail)
        : `Request failed with status ${status}`
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }

  /** True when the session is missing/expired — callers redirect to /login (FR-A5). */
  get isUnauthorized(): boolean {
    return this.status === 401
  }
}

export interface ApiRequest {
  method?: string
  /** Request payload; JSON-encoded with a JSON content-type when present. */
  json?: unknown
  signal?: AbortSignal
}

export async function apiFetch<T>(path: string, req: ApiRequest = {}): Promise<T> {
  const headers: Record<string, string> = {}
  let body: string | undefined
  if (req.json !== undefined) {
    headers['content-type'] = 'application/json'
    body = JSON.stringify(req.json)
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: req.method ?? 'GET',
    credentials: 'include',
    headers,
    body,
    signal: req.signal,
  })

  if (!response.ok) {
    throw new ApiError(response.status, await readBody(response))
  }
  return (await readBody(response)) as T
}

/** Parse a JSON body, tolerating empty (204 / no-content) responses. */
async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
