type Props = { round: number; maxRounds: number }

function stepLabel(step: number, round: number, maxRounds: number) {
  if (step < round) return 'Done'
  if (step === round) return 'In progress'
  return step === maxRounds ? 'Final round' : 'Up next'
}

// "Round n of 3" counter plus one bar per round (rule 2: at most 3 rounds).
export default function RoundProgress({ round, maxRounds }: Props) {
  const steps = Array.from({ length: maxRounds }, (_, i) => i + 1)
  return (
    <section aria-label="Round progress" className="card round-progress">
      <div className="round-progress-summary">
        <div className="eyebrow">Negotiation rounds</div>
        <div className="round-progress-count">
          Round {round} of {maxRounds}
        </div>
        <p className="muted small">
          Round {maxRounds} is the last round. Both agents make their best offer, then the session ends if there is
          no deal.
        </p>
      </div>
      <ol className="round-progress-steps">
        {steps.map((step) => {
          const state = step < round ? 'done' : step === round ? 'current' : 'todo'
          return (
            <li key={step}>
              <div className={`round-bar round-bar-${state}`} />
              <div className="round-step-title">Round {step}</div>
              <div className={`round-step-label${state === 'current' ? ' is-current' : ''}`}>
                {stepLabel(step, round, maxRounds)}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
