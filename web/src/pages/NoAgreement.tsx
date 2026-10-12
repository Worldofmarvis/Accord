import { useParams } from 'react-router-dom'
import Placeholder from '../components/Placeholder'

export default function NoAgreement() {
  const { id } = useParams()
  return (
    <Placeholder
      title={`No agreement (negotiation ${id ?? ''})`}
      description="Explains why the session ended after 3 rounds and shows the top 3 rematch suggestions."
      day="Day 5 (Thu Oct 15)"
    />
  )
}
