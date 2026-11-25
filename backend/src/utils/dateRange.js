const { toObjectId } = require('./calculations');

const ANCHOR_END = new Date('2026-11-25T23:59:59.999Z');

/**
 * Resolve date range filters and compute an equal-length previous comparison window.
 */
function parseDateRange(query = {}) {
  const preset = query.preset || '30d';
  let end = query.endDate ? new Date(query.endDate) : new Date(Math.max(Date.now(), ANCHOR_END.getTime()));
  if (Number.isNaN(end.getTime())) end = new Date(ANCHOR_END);
  if (typeof query.endDate === 'string' && query.endDate.length <= 10) {
    end.setUTCHours(23, 59, 59, 999);
  }

  let start;
  if (query.startDate) {
    start = new Date(query.startDate);
    if (Number.isNaN(start.getTime())) start = new Date(end.getTime() - 30 * 86400000);
  } else if (preset === '24h') {
    start = new Date(end.getTime() - 24 * 3600000);
  } else if (preset === '7d') {
    start = new Date(end.getTime() - 7 * 86400000);
  } else if (preset === '90d') {
    start = new Date(end.getTime() - 90 * 86400000);
  } else if (preset === 'this_month') {
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1, 0, 0, 0));
  } else if (preset === 'last_month') {
    start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1, 0, 0, 0));
    end = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 0, 23, 59, 59, 999));
  } else {
    start = new Date(end.getTime() - 30 * 86400000);
  }

  const spanMs = Math.max(86400000, end.getTime() - start.getTime());
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - spanMs);

  return { start, end, prevStart, prevEnd, preset };
}

/**
 * Append optional building/floor/department/meter filters safely while preserving RBAC scope.
 */
function applyDimensionFilters(baseFilter, query = {}) {
  const filter = { ...baseFilter };
  if (query.buildingId && query.buildingId !== 'all') {
    filter.buildingId = toObjectId(query.buildingId, 'buildingId');
  }
  if (query.floorId && query.floorId !== 'all') {
    filter.floorId = toObjectId(query.floorId, 'floorId');
  }
  if (query.departmentId && query.departmentId !== 'all') {
    const requested = toObjectId(query.departmentId, 'departmentId');
    if (filter.departmentId && filter.departmentId.$in) {
      const allowed = filter.departmentId.$in.some((id) => String(id) === String(requested));
      filter.departmentId = allowed ? requested : toObjectId('000000000000000000000000');
    } else {
      filter.departmentId = requested;
    }
  }
  if (query.meterId && query.meterId !== 'all') {
    filter.meterId = toObjectId(query.meterId, 'meterId');
  }
  return filter;
}

module.exports = {
  parseDateRange,
  applyDimensionFilters,
};
