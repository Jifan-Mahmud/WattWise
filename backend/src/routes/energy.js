const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/db');
const { requireRole, scopeFilter } = require('../middleware/auth');
const {
  toObjectId,
  computeEnergyMetrics,
  escapeCsvCell,
  escapeRegex,
} = require('../utils/calculations');
const { parseDateRange, applyDimensionFilters } = require('../utils/dateRange');
const { energyRecordSchema } = require('../schemas/validators');

const router = express.Router();

/**
 * Evaluate configured alert thresholds and create an alert when consumption exceeds limits.
 */
async function evaluateAndTriggerAlert(db, meter, record) {
  const orgThresholds = await db
    .collection('alert_thresholds')
    .find({
      organizationId: meter.organizationId,
      enabled: true,
      $or: [
        { buildingId: null, meterId: null },
        { buildingId: meter.buildingId, meterId: null },
        { meterId: meter._id },
      ],
    })
    .toArray();

  let triggeredLimit = meter.thresholdHourlyKwh;
  let matchedThresholdId = null;
  let severity = 'Medium';

  for (const rule of orgThresholds) {
    if (rule.metric === 'hourly_kwh' && record.consumptionKwh > rule.limitValue) {
      triggeredLimit = Math.min(triggeredLimit, rule.limitValue);
      matchedThresholdId = rule._id;
      severity = rule.severity;
    } else if (
      rule.metric === 'spike_ratio' &&
      record.consumptionKwh > meter.baselineHourlyKwh * (rule.spikeMultiplier || 1.65)
    ) {
      triggeredLimit = Number((meter.baselineHourlyKwh * (rule.spikeMultiplier || 1.65)).toFixed(2));
      matchedThresholdId = rule._id;
      severity = rule.severity;
    }
  }

  if (record.consumptionKwh <= meter.thresholdHourlyKwh && !matchedThresholdId) {
    return null;
  }

  if (record.consumptionKwh > meter.thresholdHourlyKwh * 1.25) {
    severity = 'High';
  }

  const alertDoc = {
    _id: new ObjectId(),
    organizationId: meter.organizationId,
    buildingId: meter.buildingId,
    buildingName: meter.buildingName,
    floorId: meter.floorId,
    departmentId: meter.departmentId,
    departmentName: meter.departmentName,
    meterId: meter._id,
    meterCode: meter.meterCode,
    thresholdId: matchedThresholdId,
    title: `${meter.meterType} consumption exceeded threshold (${meter.meterCode})`,
    description: `Recorded ${record.consumptionKwh} kWh vs limit ${triggeredLimit} kWh.`,
    alertType: record.consumptionKwh > meter.baselineHourlyKwh * 1.7 ? 'Unusual Consumption' : 'High Usage',
    severity,
    status: 'New',
    measuredValue: record.consumptionKwh,
    thresholdValue: triggeredLimit,
    unit: 'kWh',
    triggeredAt: record.timestamp,
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
  };

  await db.collection('alerts').insertOne(alertDoc);
  return alertDoc;
}

// 1. Server-side Paginated & Filtered Energy Records
router.get('/energy-records', async (req, res, next) => {
  try {
    const db = await getDb();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const { start, end } = parseDateRange({
      preset: req.query.preset || '90d',
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    let filter = scopeFilter(req, { timestamp: { $gte: start, $lte: end } });
    filter = applyDimensionFilters(filter, req.query);

    if (req.query.anomalyOnly === 'true') {
      filter.isAnomaly = true;
    }
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(req.query.q), 'i');
      filter.$or = [{ meterCode: rx }, { buildingName: rx }, { departmentName: rx }];
    }

    const allowedSort = new Set(['timestamp', 'consumptionKwh', 'estimatedCost', 'demandKw']);
    const sortField = allowedSort.has(req.query.sortBy) ? req.query.sortBy : 'timestamp';
    const sortDir = req.query.sortDir === 'asc' ? 1 : -1;

    const [records, totalCount] = await Promise.all([
      db
        .collection('energy_records')
        .find(filter)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('energy_records').countDocuments(filter),
    ]);

    res.json({
      records,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. Create Energy Record (with org check, cost calculation, duplicate guard, auto-alerting)
router.post('/energy-records', requireRole('Organization Admin', 'Facility Manager'), async (req, res, next) => {
  try {
    const parsed = energyRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid energy record' });
    }

    const db = await getDb();
    const meterId = toObjectId(parsed.data.meterId, 'meterId');
    const meter = await db
      .collection('meters')
      .findOne({ _id: meterId, organizationId: req.user.organizationId });

    if (!meter) {
      return res.status(404).json({ error: 'Meter not found inside your organization' });
    }

    const metrics = computeEnergyMetrics(
      parsed.data.consumptionKwh,
      meter.tariffPerKwh,
      meter.emissionFactorKgPerKwh
    );

    const isAnomaly = metrics.consumptionKwh > meter.thresholdHourlyKwh;

    const doc = {
      _id: new ObjectId(),
      organizationId: meter.organizationId,
      buildingId: meter.buildingId,
      floorId: meter.floorId,
      departmentId: meter.departmentId,
      meterId: meter._id,
      meterCode: meter.meterCode,
      buildingName: meter.buildingName,
      departmentName: meter.departmentName,
      consumptionKwh: metrics.consumptionKwh,
      demandKw: Number((parsed.data.demandKw || metrics.consumptionKwh * 1.06).toFixed(2)),
      powerFactor: parsed.data.powerFactor,
      estimatedCost: metrics.estimatedCost,
      carbonKg: metrics.carbonKg,
      timestamp: parsed.data.timestamp,
      isAnomaly,
      source: 'manual',
      createdAt: new Date(),
    };

    await db.collection('energy_records').insertOne(doc);
    await db
      .collection('meters')
      .updateOne({ _id: meter._id }, { $set: { lastReadingAt: parsed.data.timestamp } });

    const triggeredAlert = isAnomaly ? await evaluateAndTriggerAlert(db, meter, doc) : null;

    res.status(201).json({ record: doc, triggeredAlert });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'Duplicate energy record prevented: reading already exists for this meter and timestamp.',
      });
    }
    next(err);
  }
});

// 3. Streaming CSV Export (handles up to 50,000 rows without memory bloat)
router.get('/energy-records/export', async (req, res, next) => {
  try {
    const db = await getDb();
    const { start, end } = parseDateRange({
      preset: req.query.preset || '30d',
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    let filter = scopeFilter(req, { timestamp: { $gte: start, $lte: end } });
    filter = applyDimensionFilters(filter, req.query);
    if (req.query.anomalyOnly === 'true') filter.isAnomaly = true;
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(req.query.q), 'i');
      filter.$or = [{ meterCode: rx }, { buildingName: rx }, { departmentName: rx }];
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="wattwise-energy-report-${new Date().toISOString().slice(0, 10)}.csv"`
    );

    res.write(
      'Timestamp,Meter Code,Building,Department,Consumption (kWh),Demand (kW),Estimated Cost ($),Carbon (kg CO2e),Anomaly\n'
    );

    const cursor = db
      .collection('energy_records')
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(50000);

    for await (const row of cursor) {
      const line = [
        escapeCsvCell(new Date(row.timestamp).toISOString()),
        escapeCsvCell(row.meterCode),
        escapeCsvCell(row.buildingName),
        escapeCsvCell(row.departmentName),
        escapeCsvCell(row.consumptionKwh),
        escapeCsvCell(row.demandKw),
        escapeCsvCell(row.estimatedCost),
        escapeCsvCell(row.carbonKg),
        escapeCsvCell(row.isAnomaly ? 'Yes' : 'No'),
      ].join(',');
      res.write(`${line}\n`);
    }

    res.end();
  } catch (err) {
    next(err);
  }
});

// 4. Real-Time Energy Monitoring Simulation Tick
router.post('/simulation/tick', requireRole('Organization Admin', 'Facility Manager'), async (req, res, next) => {
  try {
    const db = await getDb();
    const meters = await db
      .collection('meters')
      .find({ organizationId: req.user.organizationId, healthStatus: { $ne: 'Offline' } })
      .limit(5)
      .toArray();

    if (!meters.length) {
      return res.json({ readings: [], triggeredAlerts: [] });
    }

    const now = new Date();
    now.setMilliseconds(0);

    const readings = [];
    const triggeredAlerts = [];

    for (const meter of meters) {
      const spikeRoll = Math.random();
      const multiplier = spikeRoll > 0.86 ? 1.78 : 0.88 + Math.random() * 0.36;
      const kwh = meter.baselineHourlyKwh * multiplier;
      const metrics = computeEnergyMetrics(kwh, meter.tariffPerKwh, meter.emissionFactorKgPerKwh);
      const isAnomaly = metrics.consumptionKwh > meter.thresholdHourlyKwh;

      const doc = {
        _id: new ObjectId(),
        organizationId: meter.organizationId,
        buildingId: meter.buildingId,
        floorId: meter.floorId,
        departmentId: meter.departmentId,
        meterId: meter._id,
        meterCode: meter.meterCode,
        buildingName: meter.buildingName,
        departmentName: meter.departmentName,
        consumptionKwh: metrics.consumptionKwh,
        demandKw: Number((metrics.consumptionKwh * 1.07).toFixed(2)),
        powerFactor: meter.powerFactor,
        estimatedCost: metrics.estimatedCost,
        carbonKg: metrics.carbonKg,
        timestamp: now,
        isAnomaly,
        source: 'simulation',
        createdAt: now,
      };

      try {
        await db.collection('energy_records').insertOne(doc);
        await db.collection('meters').updateOne({ _id: meter._id }, { $set: { lastReadingAt: now } });
        readings.push(doc);

        if (isAnomaly) {
          const alert = await evaluateAndTriggerAlert(db, meter, doc);
          if (alert) triggeredAlerts.push(alert);
        }
      } catch (e) {
        if (e.code !== 11000) throw e;
      }
    }

    res.json({ timestamp: now, readings, triggeredAlerts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
