const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/db');
const { requireRole, scopeFilter } = require('../middleware/auth');
const { toObjectId } = require('../utils/calculations');
const { parseDateRange, applyDimensionFilters } = require('../utils/dateRange');
const { userRoleUpdateSchema, scheduledReportSchema } = require('../schemas/validators');

const router = express.Router();

// 1. Energy Intelligence & Insights Module
router.get('/insights', async (req, res, next) => {
  try {
    const db = await getDb();
    const { start, end, prevStart, prevEnd } = parseDateRange({ preset: req.query.preset || '30d' });

    const matchCurrent = scopeFilter(req, { timestamp: { $gte: start, $lte: end } });
    const matchPrev = scopeFilter(req, { timestamp: { $gte: prevStart, $lte: prevEnd } });

    const [anomalies, facetRes, prevRes, recommendations] = await Promise.all([
      db
        .collection('energy_records')
        .find({ ...matchCurrent, isAnomaly: true })
        .sort({ consumptionKwh: -1, timestamp: -1 })
        .limit(12)
        .toArray(),
      db
        .collection('energy_records')
        .aggregate([
          { $match: matchCurrent },
          {
            $facet: {
              totals: [
                {
                  $group: {
                    _id: null,
                    totalKwh: { $sum: '$consumptionKwh' },
                    totalCost: { $sum: '$estimatedCost' },
                    totalCarbonKg: { $sum: '$carbonKg' },
                  },
                },
              ],
              peakHours: [
                {
                  $group: {
                    _id: { $hour: '$timestamp' },
                    avgKwh: { $avg: '$consumptionKwh' },
                    totalKwh: { $sum: '$consumptionKwh' },
                  },
                },
                { $sort: { avgKwh: -1 } },
                { $limit: 5 },
              ],
              topBuildings: [
                {
                  $group: {
                    _id: '$buildingId',
                    name: { $first: '$buildingName' },
                    totalKwh: { $sum: '$consumptionKwh' },
                    totalCost: { $sum: '$estimatedCost' },
                  },
                },
                { $sort: { totalKwh: -1 } },
                { $limit: 3 },
              ],
              topDepartments: [
                {
                  $group: {
                    _id: '$departmentId',
                    name: { $first: '$departmentName' },
                    totalKwh: { $sum: '$consumptionKwh' },
                    totalCost: { $sum: '$estimatedCost' },
                  },
                },
                { $sort: { totalKwh: -1 } },
                { $limit: 3 },
              ],
            },
          },
        ])
        .toArray(),
      db
        .collection('energy_records')
        .aggregate([
          { $match: matchPrev },
          {
            $group: {
              _id: null,
              totalKwh: { $sum: '$consumptionKwh' },
              totalCost: { $sum: '$estimatedCost' },
            },
          },
        ])
        .toArray(),
      db
        .collection('energy_recommendations')
        .find({ organizationId: req.user.organizationId })
        .sort({ estimatedMonthlySavingsUsd: -1 })
        .toArray(),
    ]);

    const facet = facetRes[0] || {};
    const totals = facet.totals?.[0] || { totalKwh: 0, totalCost: 0, totalCarbonKg: 0 };
    const prevTotals = prevRes[0] || { totalKwh: 0, totalCost: 0 };
    const totalCarbonKg = Number(totals.totalCarbonKg.toFixed(1));
    const metricTonsCo2 = Number((totalCarbonKg / 1000).toFixed(2));

    res.json({
      anomalies,
      peakHours: (facet.peakHours || []).map((h) => ({
        hour: `${String(h._id).padStart(2, '0')}:00`,
        avgKwh: Number(h.avgKwh.toFixed(2)),
        totalKwh: Number(h.totalKwh.toFixed(1)),
      })),
      highestConsumers: {
        buildings: facet.topBuildings || [],
        departments: facet.topDepartments || [],
      },
      historicalComparison: {
        currentKwh: Number(totals.totalKwh.toFixed(1)),
        currentCost: Number(totals.totalCost.toFixed(2)),
        prevKwh: Number(prevTotals.totalKwh.toFixed(1)),
        prevCost: Number(prevTotals.totalCost.toFixed(2)),
        changePct:
          prevTotals.totalKwh > 0
            ? Number((((totals.totalKwh - prevTotals.totalKwh) / prevTotals.totalKwh) * 100).toFixed(1))
            : 0,
      },
      carbonSummary: {
        totalCarbonKg,
        metricTonsCo2,
        equivalentTreesYear: Math.round(totalCarbonKg / 21.77),
      },
      recommendations,
    });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/insights/recommendations/:id',
  requireRole('Organization Admin', 'Facility Manager', 'Department Manager'),
  async (req, res, next) => {
    try {
      const status = req.body.status;
      if (!['Open', 'Accepted', 'Dismissed'].includes(status)) {
        return res.status(400).json({ error: 'Status must be Open, Accepted, or Dismissed' });
      }
      const id = toObjectId(req.params.id, 'recommendationId');
      const db = await getDb();
      const updated = await db
        .collection('energy_recommendations')
        .findOneAndUpdate(
          { _id: id, organizationId: req.user.organizationId },
          { $set: { status, updatedBy: req.user.email, updatedAt: new Date() } },
          { returnDocument: 'after' }
        );
      if (!updated) return res.status(404).json({ error: 'Recommendation not found' });
      res.json({ recommendation: updated });
    } catch (err) {
      next(err);
    }
  }
);

// 2. Custom Date-Range Report Summary & Scheduled Reports
router.get('/reports/summary', async (req, res, next) => {
  try {
    const db = await getDb();
    const { start, end } = parseDateRange(req.query);
    let match = scopeFilter(req, { timestamp: { $gte: start, $lte: end } });
    match = applyDimensionFilters(match, req.query);

    const [org, rows, totals] = await Promise.all([
      db.collection('organizations').findOne({ _id: req.user.organizationId }),
      db
        .collection('energy_records')
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: { building: '$buildingName', department: '$departmentName' },
              totalKwh: { $sum: '$consumptionKwh' },
              totalCost: { $sum: '$estimatedCost' },
              carbonKg: { $sum: '$carbonKg' },
              peakKwh: { $max: '$consumptionKwh' },
              readings: { $sum: 1 },
              anomalies: { $sum: { $cond: ['$isAnomaly', 1, 0] } },
            },
          },
          { $sort: { totalKwh: -1 } },
        ])
        .toArray(),
      db
        .collection('energy_records')
        .aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              totalKwh: { $sum: '$consumptionKwh' },
              totalCost: { $sum: '$estimatedCost' },
              carbonKg: { $sum: '$carbonKg' },
              readings: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    res.json({
      generatedAt: new Date(),
      organization: org?.name || 'WattWise Organization',
      currency: org?.currency || 'USD',
      range: { start, end },
      totals: totals[0] || { totalKwh: 0, totalCost: 0, carbonKg: 0, readings: 0 },
      breakdown: rows.map((r) => ({
        building: r._id.building,
        department: r._id.department,
        totalKwh: Number(r.totalKwh.toFixed(1)),
        totalCost: Number(r.totalCost.toFixed(2)),
        carbonKg: Number(r.carbonKg.toFixed(1)),
        peakKwh: Number(r.peakKwh.toFixed(2)),
        readings: r.readings,
        anomalies: r.anomalies,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/reports/scheduled', async (req, res, next) => {
  try {
    const db = await getDb();
    const schedules = await db
      .collection('scheduled_reports')
      .find({ organizationId: req.user.organizationId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ schedules });
  } catch (err) {
    next(err);
  }
});

router.post('/reports/scheduled', requireRole('Organization Admin', 'Facility Manager'), async (req, res, next) => {
  try {
    const parsed = scheduledReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid report schedule' });
    }
    const db = await getDb();
    const doc = {
      _id: new ObjectId(),
      organizationId: req.user.organizationId,
      name: parsed.data.name,
      frequency: parsed.data.frequency,
      format: parsed.data.format,
      recipients: parsed.data.recipients,
      buildingId:
        parsed.data.buildingId && parsed.data.buildingId !== 'all'
          ? toObjectId(parsed.data.buildingId, 'buildingId')
          : null,
      lastSentAt: null,
      nextRunAt: new Date(Date.now() + 86400000),
      enabled: parsed.data.enabled,
      createdBy: req.user.email,
      createdAt: new Date(),
    };
    await db.collection('scheduled_reports').insertOne(doc);
    res.status(201).json({ schedule: doc });
  } catch (err) {
    next(err);
  }
});

router.delete('/reports/scheduled/:id', requireRole('Organization Admin', 'Facility Manager'), async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id, 'scheduleId');
    const db = await getDb();
    const resDel = await db
      .collection('scheduled_reports')
      .deleteOne({ _id: id, organizationId: req.user.organizationId });
    if (!resDel.deletedCount) return res.status(404).json({ error: 'Schedule not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 3. Organization User & Permissions Management (Organization Admin)
router.get('/users', requireRole('Organization Admin'), async (req, res, next) => {
  try {
    const db = await getDb();
    const [users, departments] = await Promise.all([
      db
        .collection('wattwise_profiles')
        .find({ organizationId: req.user.organizationId })
        .sort({ createdAt: 1 })
        .toArray(),
      db.collection('departments').find({ organizationId: req.user.organizationId }).toArray(),
    ]);

    const deptMap = new Map(departments.map((d) => [String(d._id), d.name]));
    const items = users.map((u) => ({
      ...u,
      departmentNames: (u.departmentIds || []).map((id) => deptMap.get(String(id)) || String(id)),
    }));

    res.json({ users: items });
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:id', requireRole('Organization Admin'), async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id, 'userId');
    const parsed = userRoleUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid user update' });
    }

    const db = await getDb();
    const deptIds = parsed.data.departmentIds
      .filter((d) => ObjectId.isValid(d))
      .map((d) => new ObjectId(d));

    const updated = await db
      .collection('wattwise_profiles')
      .findOneAndUpdate(
        { _id: id, organizationId: req.user.organizationId },
        {
          $set: {
            role: parsed.data.role,
            departmentIds: deptIds,
            status: parsed.data.status,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

    if (!updated) return res.status(404).json({ error: 'User profile not found' });
    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

// 4. Current User Profile Settings (readable by all roles; self-update allowed for profile prefs even for Viewer via explicit route exception or settings)
router.get('/profile', async (req, res, next) => {
  try {
    const db = await getDb();
    const [profile, org] = await Promise.all([
      db.collection('wattwise_profiles').findOne({ email: req.user.email }),
      db.collection('organizations').findOne({ _id: req.user.organizationId }),
    ]);
    res.json({ profile, organization: org });
  } catch (err) {
    next(err);
  }
});

router.patch('/profile', async (req, res, next) => {
  try {
    const update = {};
    if (typeof req.body.name === 'string' && req.body.name.trim().length >= 2) {
      update.name = req.body.name.trim();
    }
    if (['dark', 'light'].includes(req.body.themePreference)) {
      update.themePreference = req.body.themePreference;
    }
    if (typeof req.body.timezone === 'string' && req.body.timezone.trim().length >= 2) {
      update.timezone = req.body.timezone.trim();
    }
    update.updatedAt = new Date();

    const db = await getDb();
    const updated = await db
      .collection('wattwise_profiles')
      .findOneAndUpdate(
        { email: req.user.email },
        { $set: update },
        { returnDocument: 'after' }
      );
    res.json({ profile: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
