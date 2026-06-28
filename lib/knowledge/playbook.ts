import negative_outlook from './playbook/negative_outlook.json'

export type Playbook = {
  name: string
  applies_to: string[]
  recommended_actions: string[]
  tone_shift?: string
}

// Add new playbook files here. Each playbook declares which outlook states
// it applies to via its `applies_to` array.
const PLAYBOOKS: Playbook[] = [negative_outlook]

/**
 * Load the playbook for a given outlook state. Returns null if no playbook
 * applies (e.g. for Stable or Positive outlooks).
 */
export function loadPlaybook(outlook: string | null): Playbook | null {
  if (!outlook) return null
  return PLAYBOOKS.find((p) => p.applies_to.includes(outlook)) ?? null
}
