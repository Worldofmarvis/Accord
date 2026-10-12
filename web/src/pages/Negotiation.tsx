import { useParams } from 'react-router-dom'
import Placeholder from '../components/Placeholder'

export default function Negotiation() {
  const { id } = useParams()
  return (
    <Placeholder
      title={`Negotiation ${id ?? ''}`}
      description="Live negotiation: round counter (n of 3), log, agent cards, price-range chart, and chat."
      day="Day 3 (Tue Oct 13), chat on Day 4"
    />
  )
}
