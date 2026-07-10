const { supabase } = require('../config/supabase');
const { unauthorized, error } = require('../utils/response');

/**
 * Verifies the Supabase JWT sent in the Authorization header.
 * Attaches req.user and req.session on success.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'Missing or malformed Authorization header');
    }

    const token = authHeader.split(' ')[1];
    const { data, error: authError } = await supabase.auth.getUser(token);

    if (authError || !data?.user) {
      return unauthorized(res, 'Invalid or expired session token');
    }

    req.user = data.user;
    next();
  } catch (err) {
    return error(res, 'Authentication error', 500, err.message);
  }
};

/**
 * Role-based access control middleware factory.
 * Usage: requireRole('admin') or requireRole(['admin', 'forest_officer'])
 */
const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    const userRole = req.user.user_metadata?.role || 'forest_officer';
    if (!roles.includes(userRole)) {
      return res.status(403).json({ success: false, message: `Access denied. Required role: ${roles.join(' or ')}` });
    }
    next();
  };
};

module.exports = { requireAuth, requireRole };
