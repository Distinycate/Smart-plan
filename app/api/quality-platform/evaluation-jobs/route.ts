// Temporary compatibility alias created during Phase 4 experimentation.
// New integrations must use POST /api/evaluations/create.
// The target handler does not consume dynamic route params.
export { dynamic, maxDuration, POST } from '../../evaluations/create/route';
