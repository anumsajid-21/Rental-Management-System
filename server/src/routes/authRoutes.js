import { Router } from 'express';
import { register, login, me } from '../controllers/authController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);

/* Example of role-protected endpoint (ready for future phases):
   router.get('/owner-only', requireAuth, requireRole('property_owner'), handler);
   router.get('/tenant-only', requireAuth, requireRole('tenant'), handler);
*/

export default router;
