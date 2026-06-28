import Link from 'next/link'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm text-muted">
        <p>&copy; {year} The Ratings Coach. All rights reserved.</p>
        <nav className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/security" className="hover:text-foreground">
            Security
          </Link>
        </nav>
      </div>
    </footer>
  )
}
