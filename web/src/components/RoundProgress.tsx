type Props = { round: number; maxRounds: number }

// A small "Round n of 3" with a slim bar, one segment per round (rule 2: at most 3 rounds).
// Finished rounds are navy, the round in progress is blue, the rest are grey. Nothing moves.
export default function RoundProgress({ round, maxRounds }: Props) {
  const steps = Array.from({ length: maxRounds }, (_, i) => i + 1)
  return (
    <div className="round-row">
      <span className="round-label">
        Round {round} of {maxRounds}
      </span>
      <div
        className="round-track"
        role="progressbar"
        aria-label="Negotiation round"
        aria-valuemin={1}
        aria-valuemax={maxRounds}
        aria-valuenow={round}
        aria-valuetext={`Round ${round} of ${maxRounds}`}
      >
        {steps.map((step) => (
          <span key={step} className={`round-seg round-seg-${step < round ? 'done' : step === round ? 'current' : 'todo'}`} />
        ))}
      </div>
      {round === maxRounds && <span className="muted caption round-hint">Last round</span>}
    </div>
  )
}
