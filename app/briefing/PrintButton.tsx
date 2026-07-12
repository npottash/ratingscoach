'use client'

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium hover:border-brand hover:text-brand print:hidden"
    >
      Export to PDF
    </button>
  )
}
