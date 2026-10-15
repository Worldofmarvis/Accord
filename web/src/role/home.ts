import type { Role } from '../types/me'

/** Where each side lands after choosing it: a buyer starts by searching, a seller starts on their listings. */
export const homePath = (role: Role) => (role === 'buyer' ? '/search' : '/seller')
