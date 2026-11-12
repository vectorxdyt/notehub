/** @param {{email?: string, email_verified?: boolean, firebase?: {sign_in_provider?: string}}} claims */
export function verifiedGoogleEmail(claims) {
  return claims.email_verified === true &&
    claims.firebase?.sign_in_provider === 'google.com' &&
    typeof claims.email === 'string'
    ? claims.email.trim().toLowerCase()
    : null;
}
