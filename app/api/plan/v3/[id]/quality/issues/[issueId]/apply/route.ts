/**
 * Forwarding route for apply fix
 * Allows both /api/plan/v3/[id]/quality/issues/[issueId]/apply and /api/plan/v3/[id]/quality/issues/[issueId]
 */
// The target handler awaits Promise-based route params (Next 15).
export { POST } from '../route';
