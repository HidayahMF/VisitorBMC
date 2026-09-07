import { type VisitStatus } from '../types/visit';

export function visitStatusLabel(status: VisitStatus): string {
  const labels: Record<VisitStatus, string> = {
    PENDING_INDUCTION: 'Pending Induction',
    READY_FOR_CHECKIN: 'Ready for Check-In',
    IN: 'Inside',
    OUT: 'Checked Out',
    CANCELLED: 'Cancelled',
  };
  return labels[status] || status;
}
