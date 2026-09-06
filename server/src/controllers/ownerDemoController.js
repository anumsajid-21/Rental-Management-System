import { demoData } from '../db/demoSeed.js';

/**
 * POST /api/owner/demo-data — load realistic mock data into the logged-in
 * owner's account (development/testing helper). Idempotent guard: refuses
 * when the owner already has properties unless { force: true } is passed.
 */
export function loadDemoData(req, res) {
  if (demoData.hasData(req.user.id) && !req.body?.force) {
    return res.status(409).json({
      error: 'Your account already has data. Pass { force: true } to add a demo batch anyway.',
    });
  }
  const result = demoData.seedForOwner(req.user.id);
  res.status(201).json({
    message: `Demo data loaded: ${result.properties} properties, ${result.transactions} transactions, ${result.maintenance} maintenance requests, ${result.tenants} demo tenants (demo.tenant passwords: password123).`,
    ...result,
  });
}
