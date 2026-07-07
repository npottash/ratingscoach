/** True when the email matches the ADMIN_EMAIL env var (server-side only). */
export function isAdmin(email: string | undefined | null): boolean {
  const admin = process.env.ADMIN_EMAIL
  if (!admin || !email) return false
  return admin.trim().toLowerCase() === email.trim().toLowerCase()
}
