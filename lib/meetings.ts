/**
 * True for transaction-driven meetings. The label was briefly
 * 'Transaction Review' (2026-07) before reverting to 'Transaction Update';
 * sessions created in the interim keep that value, so match both.
 */
export function isTransactionMeeting(
  meetingType: string | null | undefined
): boolean {
  return (
    meetingType === 'Transaction Review' || meetingType === 'Transaction Update'
  )
}
