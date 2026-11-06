import type { ApprovalStatus, Decision } from '../types/marketplace'

/**
 * The deal's overall state from each side's decision (docs/API.md, "Approval before payment").
 * The server decides this too; the front end and the demo data use the same rule.
 */
export function approvalStatus(buyer: Decision, seller: Decision): ApprovalStatus {
  if (buyer === 'declined' || seller === 'declined') return 'declined'
  if (buyer === 'approved' && seller === 'approved') return 'approved'
  return 'pending'
}
