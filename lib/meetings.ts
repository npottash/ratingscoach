/**
 * True for transaction-driven meetings. The label changed from
 * 'Transaction Update' to 'Transaction Review' (2026-07); sessions created
 * before the rename keep the old value, so match both.
 */
export function isTransactionMeeting(
  meetingType: string | null | undefined
): boolean {
  return (
    meetingType === 'Transaction Review' || meetingType === 'Transaction Update'
  )
}
