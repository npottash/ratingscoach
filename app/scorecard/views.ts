// Shared between the server page (deep-link validation) and the client
// component — must stay free of 'use client' so the server can call it.

export type ViewId =
  | 'factors'
  | 'advocacy'
  | 'memo'
  | 'checklist'
  | 'briefing'
  | 'advisory'
  | 'next'
  | 'debrief'

const VIEW_IDS: ViewId[] = [
  'factors',
  'advocacy',
  'memo',
  'checklist',
  'briefing',
  'advisory',
  'next',
  'debrief',
]

export function isViewId(v: string | undefined): v is ViewId {
  return VIEW_IDS.includes(v as ViewId)
}
