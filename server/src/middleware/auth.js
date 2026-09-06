import jwt from 'jsonwebtoken';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

/** Requires a valid Bearer token; attaches the fresh user to req.user. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = req.app.get('userModel').findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

/** Restrict a route to specific roles. Usage: requireRole('tenant'). */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to access this resource.' });
    }
    next();
  };
}
