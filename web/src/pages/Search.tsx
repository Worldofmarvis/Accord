import { useRole } from '../role/useRole'
import ListingSearch from './ListingSearch'
import RequestSearch from './RequestSearch'

// Search goes both ways: a buyer looks for seller listings, a seller looks for what buyers need.
export default function Search() {
  const { role } = useRole()
  return role === 'buyer' ? <ListingSearch /> : <RequestSearch />
}
