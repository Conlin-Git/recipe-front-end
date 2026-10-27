/** 这里只做启动时的过期预判；签名、权限和最终有效期仍由后端校验。 */
export function readTokenClaims(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]!.replace(/-/g, '+').replace(/_/g, '/')
    const claims: unknown = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')))
    return claims && typeof claims === 'object' && !Array.isArray(claims)
      ? claims as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

export function isTokenUnexpired(token: string, now = Date.now()): boolean {
  const claims = readTokenClaims(token)
  return typeof claims?.exp === 'number' && claims.exp * 1000 > now
}

export function getFilingReviewToken(candidate: string, now = Date.now()): string {
  const token = candidate.trim()
  const claims = readTokenClaims(token)
  if (
    claims?.scope !== 'filing-review'
    || typeof claims.iat !== 'number'
    || typeof claims.exp !== 'number'
    || claims.exp <= claims.iat
    || claims.exp - claims.iat > 30 * 24 * 3600
    || !isTokenUnexpired(token, now)
  ) return ''
  return token
}
