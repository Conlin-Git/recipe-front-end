/** 仅做启动时的过期预判；签名和最终有效期仍由后端校验。 */
function readTokenClaims(token: string): Record<string, unknown> | null {
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
