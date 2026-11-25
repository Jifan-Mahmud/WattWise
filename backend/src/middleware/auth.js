const { jwtVerify } = require('jose-cjs');
const { ObjectId } = require('mongodb');
const { JWT_SECRET } = require('../config/env');
const { getDb } = require('../config/db');

const secretKey = new TextEncoder().encode(JWT_SECRET);

/**
 * Verify Bearer JWT and hydrate current RBAC profile from MongoDB.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { payload } = await jwtVerify(token, secretKey);
    if (!payload?.email) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const db = await getDb();
    const profile = await db.collection('wattwise_profiles').findOne({ email: payload.email });

    if (!profile) {
      return res.status(403).json({ error: 'Organization profile not found' });
    }
    if (profile.status === 'Suspended') {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    req.user = {
      id: String(profile._id),
      email: profile.email,
      name: profile.name,
      organizationId: profile.organizationId,
      role: profile.role,
      departmentIds: Array.isArray(profile.departmentIds) ? profile.departmentIds : [],
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

/**
 * Enforce role-based access control on sensitive operations.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: requires one of [${allowedRoles.join(', ')}]`,
      });
    }
    next();
  };
}

/**
 * Block any mutating requests from read-only Viewer users.
 */
function blockViewerWrites(req, res, next) {
  if (req.user?.role === 'Viewer' && req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(403).json({
      error: 'Forbidden: Viewer accounts have read-only permissions',
    });
  }
  next();
}

/**
 * Build an organization and department-scoped MongoDB query filter.
 */
function scopeFilter(req, extra = {}) {
  const filter = {
    organizationId: req.user.organizationId,
    ...extra,
  };

  if (req.user.role === 'Department Manager') {
    const allowedDepts = req.user.departmentIds.length
      ? req.user.departmentIds
      : [new ObjectId()]; // matches nothing if unassigned

    if (filter.departmentId) {
      const requested = String(filter.departmentId);
      const isAllowed = allowedDepts.some((d) => String(d) === requested);
      if (!isAllowed) {
        filter.departmentId = new ObjectId(); // force empty result set on unauthorized dept
      }
    } else {
      filter.departmentId = { $in: allowedDepts };
    }
  }

  return filter;
}

module.exports = {
  requireAuth,
  requireRole,
  blockViewerWrites,
  scopeFilter,
};
