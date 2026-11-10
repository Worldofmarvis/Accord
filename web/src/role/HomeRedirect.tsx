import { Navigate } from 'react-router-dom'
import { homePath } from './home'
import { useRole } from './useRole'

/** The address "/" sends each side to its own start page. */
export default function HomeRedirect() {
  const { role } = useRole()
  return <Navigate to={homePath(role)} replace />
}
