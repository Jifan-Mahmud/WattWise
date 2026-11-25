const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/db');
const { requireRole, scopeFilter } = require('../middleware/auth');
const { toObjectId } = require('../utils/calculations');
const { thresholdSchema, alertStatusSchema } = require('../schemas/validators');

const router = express.Router();

// 1. Alerts Listing & Status Summary
router.get('/alerts', async (req, res, next) => {
  try {
    const db = await getDb();
    const filter = scopeFilter(req);
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    if (req.query.severity && req.query.severity !== 'all') {
      filter.severity = req.query.severity;
    }
    if (req.query.buildingId && req.query.buildingId !== 'all') {
      filter.buildingId = toObjectId(req.query.buildingId, 'buildingId');
    }

    const [alerts, counts] = await Promise.all([
      db.collection('alerts').find(filter).sort({ triggeredAt: -1 }).limit(100).toArray(),
      db
        .collection('alerts')
        .aggregate([
          { $match: scopeFilter(req) },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const summary = { New: 0, Acknowledged: 0, Resolved: 0 };
    for (const c of counts) {
      if (c._id in summary) summary[c._id] = c.count;
    }

    res.json({ alerts, summary });
  } catch (err) {
    next(err);
  }
});

// 2. Acknowledge or Resolve Alert
router.patch(
  '/alerts/:id/status',
  requireRole('Organization Admin', 'Facility Manager', 'Department Manager'),
  async (req, res, next) => {
    try {
      const parsed = alertStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid status' });
      }

      const id = toObjectId(req.params.id, 'alertId');
      const filter = scopeFilter(req, { _id: id });
      const now = new Date();
      const setFields = { status: parsed.data.status };

      if (parsed.data.status === 'Acknowledged') {
        setFields.acknowledgedBy = req.user.name;
        setFields.acknowledgedAt = now;
      } else if (parsed.data.status === 'Resolved') {
        setFields.resolvedBy = req.user.name;
        setFields.resolvedAt = now;
        if (!setFields.acknowledgedAt) {
          setFields.acknowledgedBy = req.user.name;
          setFields.acknowledgedAt = now;
        }
      }

      const db = await getDb();
      const updated = await db
        .collection('alerts')
        .findOneAndUpdate(filter, { $set: setFields }, { returnDocument: 'after' });

      if (!updated) return res.status(404).json({ error: 'Alert not found or unauthorized' });
      res.json({ alert: updated });
    } catch (err) {
      next(err);
    }
  }
);

// 3. Thresholds CRUD (Facility Manager & Organization Admin)
router.get('/thresholds', async (req, res, next) => {
  try {
    const db = await getDb();
    const [thresholds, buildings, meters] = await Promise.all([
      db
        .collection('alert_thresholds')
        .find({ organizationId: req.user.organizationId })
        .sort({ createdAt: -1 })
        .toArray(),
      db.collection('buildings').find({ organizationId: req.user.organizationId }).toArray(),
      db.collection('meters').find({ organizationId: req.user.organizationId }).toArray(),
    ]);

    const bMap = new Map(buildings.map((b) => [String(b._id), b.name]));
    const mMap = new Map(meters.map((m) => [String(m._id), m.meterCode]));

    const items = thresholds.map((t) => ({
      ...t,
      buildingName: t.buildingId ? bMap.get(String(t.buildingId)) || 'Building' : 'All Buildings',
      meterCode: t.meterId ? mMap.get(String(t.meterId)) || 'Meter' : 'All Meters',
    }));

    res.json({ thresholds: items });
  } catch (err) {
    next(err);
  }
});

router.post('/thresholds', requireRole('Organization Admin', 'Facility Manager'), async (req, res, next) => {
  try {
    const parsed = thresholdSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid threshold rule' });
    }
    const db = await getDb();
    const doc = {
      _id: new ObjectId(),
      organizationId: req.user.organizationId,
      buildingId:
        parsed.data.buildingId && parsed.data.buildingId !== 'all'
          ? toObjectId(parsed.data.buildingId, 'buildingId')
          : null,
      meterId:
        parsed.data.meterId && parsed.data.meterId !== 'all'
          ? toObjectId(parsed.data.meterId, 'meterId')
          : null,
      name: parsed.data.name,
      metric: parsed.data.metric,
      limitValue: parsed.data.limitValue,
      spikeMultiplier: parsed.data.spikeMultiplier,
      severity: parsed.data.severity,
      enabled: parsed.data.enabled,
      createdBy: req.user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection('alert_thresholds').insertOne(doc);
    res.status(201).json({ threshold: doc });
  } catch (err) {
    next(err);
  }
});

router.patch('/thresholds/:id', requireRole('Organization Admin', 'Facility Manager'), async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id, 'thresholdId');
    const parsed = thresholdSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid threshold update' });
    }
    const db = await getDb();
    const updated = await db
      .collection('alert_thresholds')
      .findOneAndUpdate(
        { _id: id, organizationId: req.user.organizationId },
        { $set: { ...parsed.data, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
    if (!updated) return res.status(404).json({ error: 'Threshold rule not found' });
    res.json({ threshold: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/thresholds/:id', requireRole('Organization Admin', 'Facility Manager'), async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id, 'thresholdId');
    const db = await getDb();
    const resDel = await db
      .collection('alert_thresholds')
      .deleteOne({ _id: id, organizationId: req.user.organizationId });
    if (!resDel.deletedCount) return res.status(404).json({ error: 'Threshold rule not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
