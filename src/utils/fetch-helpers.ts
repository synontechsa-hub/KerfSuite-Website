/**
 * Extracts a human-readable error message from a failed API response.
 * API routes in this project respond with `{ error: string }` on failure,
 * so we surface that instead of discarding it behind a generic message.
 */
export async function getApiErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json()
    if (body && typeof body.error === 'string' && body.error.length > 0) {
      return body.error
    }
  } catch {
    // Response body was not JSON; fall through to the generic fallback.
  }
  return fallback
}
