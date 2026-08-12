const ROUTE_PATTERN = /^[A-Za-z0-9:_-]{1,64}$/
const DEFAULT_TIMEOUT_MS = 4000

export async function postNui(route, payload = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!ROUTE_PATTERN.test(route)) {
    throw new Error('Invalid NUI route')
  }

  if (typeof window.GetParentResourceName !== 'function') {
    return { ok: true, skipped: true }
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const resourceName = window.GetParentResourceName()
    const response = await fetch(`https://${resourceName}/${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`NUI request failed with status ${response.status}`)
    }

    return { ok: true }
  } finally {
    window.clearTimeout(timer)
  }
}
