const STEPS = [
  { id: 1, label: 'Intake' },
  { id: 2, label: 'Narrative' },
  { id: 3, label: 'Simulation' },
  { id: 4, label: 'Scorecard' },
] as const

export type StepId = (typeof STEPS)[number]['id']

export function StepIndicator({ current }: { current: StepId }) {
  return (
    <nav aria-label="Progress" className="border-b border-border bg-surface">
      <ol className="mx-auto flex w-full max-w-5xl items-center gap-4 px-6 py-4 text-sm">
        {STEPS.map((step, idx) => {
          const isCurrent = step.id === current
          const isComplete = step.id < current
          return (
            <li key={step.id} className="flex items-center gap-3">
              <span
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                  isCurrent
                    ? 'bg-brand text-white'
                    : isComplete
                      ? 'bg-brand/15 text-brand'
                      : 'bg-white text-muted border border-border',
                ].join(' ')}
              >
                {step.id}
              </span>
              <span
                className={
                  isCurrent
                    ? 'font-medium text-foreground'
                    : isComplete
                      ? 'text-foreground'
                      : 'text-muted'
                }
              >
                {step.label}
              </span>
              {idx < STEPS.length - 1 && (
                <span className="mx-2 hidden h-px w-10 bg-border sm:block" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
