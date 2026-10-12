import { useParams } from 'react-router-dom'
import Placeholder from '../components/Placeholder'

export default function Payment() {
  const { id } = useParams()
  return (
    <Placeholder
      title={`Approve and pay (negotiation ${id ?? ''})`}
      description="Both humans approve the agreed price, then the buyer pays with the PayPal sandbox button."
      day="Day 5 (Thu Oct 15)"
    />
  )
}
