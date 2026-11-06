import type { ReactNode } from 'react'

type Tone = 'info' | 'neutral' | 'warning' | 'success' | 'primary'

type Props = { tone?: Tone; children: ReactNode }

export default function Badge({ tone = 'neutral', children }: Props) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}
