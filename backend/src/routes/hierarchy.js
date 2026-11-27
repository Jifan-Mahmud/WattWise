const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/db');
const { requireRole, scopeFilter } = require('../middleware/auth');
const { toObjectId, escapeRegex } = require('../utils/calculations');
const {
  organizationSchema,
  buildingSchema,
  floorSchema,
  departmentSchema,
  meterSchema,
} = require('../schemas/validators');

const router = express.Router();

// 1. Organization Info & Portfolio
router.get('/organizations/current', async (req, res, next) => {
  try {
    const db = await getDb();
    const org = await db.collection('organizations').findOne({ _id: req.user.organizationId });
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    const [buildingsCount, floorsCount, departmentsCount, metersCount] = await Promise.all([
      db.collection('buildings').countDocuments({ organizationId: org._id }),
      db.collection('floors').countDocuments({ organizationId: org._id }),
      db.collection('departments').countDocuments({ organizationId: org._id }),
      db.collection('meters').countDocuments({ organizationId: org._id }),
    ]);

    res.json({
      organization: org,
      counts: { buildingsCount, floorsCount, departmentsCount, metersCount },
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/organizations/current', requireRole('Organization Admin'), async (req, res, next) => {
  try {
    const parsed = organizationSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid payload' });
    }
    const db = await getDb();
    const result = await db
      .collection('organizations')
      .findOneAndUpdate(
        { _id: req.user.organizationId },
        { $set: { ...parsed.data, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
    res.json({ organization: result });
  } catch (err) {
    next(err);
  }
});

const SEEDED_PORTFOLIO_SLUGS = [
  'northgrid-commercial',
  'apex-semiconductor',
  'metro-university',
];

function accessibleOrgFilter(req) {
  const clauses = [
    { _id: req.user.organizationId },
    { ownerEmail: req.user.email },
    { contactEmail: req.user.email },
  ];
  if (req.user.email === 'admin@wattwise.io') {
    clauses.push({ slug: { $in: SEEDED_PORTFOLIO_SLUGS } });
  }
  return { $or: clauses };
}

router.get('/organizations/portfolio', async (req, res, next) => {
  try {
    const db = await getDb();
    const orgs = await db
      .collection('organizations')
      .find(accessibleOrgFilter(req))
      .sort({ name: 1 })
      .toArray();
    const enriched = await Promise.all(
      orgs.map(async (org) => {
        const [buildings, meters] = await Promise.all([
          db.collection('buildings').countDocuments({ organizationId: org._id }),
          db.collection('meters').countDocuments({ organizationId: org._id }),
        ]);
        return {
          ...org,
          isCurrent: String(org._id) === String(req.user.organizationId),
          buildingsCount: buildings,
          metersCount: meters,
        };
      })
    );
    res.json({ organizations: enriched });
  } catch (err) {
    next(err);
  }
});

router.post('/organizations', requireRole('Organization Admin'), async (req, res, next) => {
  try {
    const parsed = organizationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid organization data' });
    }
    const db = await getDb();
    const slug = `${parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const doc = {
      _id: new ObjectId(),
      ...parsed.data,
      ownerEmail: req.user.email,
      slug,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.collection('organizations').insertOne(doc);
    res.status(201).json({ organization: doc });
  } catch (err) {
    next(err);
  }
});

router.post('/organizations/switch', requireRole('Organization Admin'), async (req, res, next) => {
  try {
    const orgId = toObjectId(req.body.organizationId, 'organizationId');
    const db = await getDb();
    const org = await db.collection('organizations').findOne({ _id: orgId });
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    const allowed = await db
      .collection('organizations')
      .findOne({ _id: orgId, ...accessibleOrgFilter(req) });
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: organization switch outside your portfolio' });
    }

    await db
      .collection('wattwise_profiles')
      .updateOne({ email: req.user.email }, { $set: { organizationId: org._id, updatedAt: new Date() } });

    res.json({ ok: true, organization: org });
  } catch (err) {
    next(err);
  }
});

// 2. Buildings CRUD
router.get('/buildings', async (req, res, next) => {
  try {
    const db = await getDb();
    const filter = { organizationId: req.user.organizationId };
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(req.query.q), 'i');
      filter.$or = [{ name: rx }, { code: rx }, { city: rx }];
    }

    const buildings = await db.collection('buildings').find(filter).sort({ name: 1 }).toArray();
    const buildingIds = buildings.map((b) => b._id);

    const [floorCounts, meterCounts, usageStats] = await Promise.all([
      db
        .collection('floors')
        .aggregate([
          { $match: { buildingId: { $in: buildingIds } } },
          { $group: { _id: '$buildingId', count: { $sum: 1 } } },
        ])
        .toArray(),
      db
        .collection('meters')
        .aggregate([
          { $match: { buildingId: { $in: buildingIds } } },
          { $group: { _id: '$buildingId', count: { $sum: 1 } } },
        ])
        .toArray(),
      db
        .collection('energy_records')
        .aggregate([
          {
            $match: {
              organizationId: req.user.organizationId,
              buildingId: { $in: buildingIds },
              timestamp: { $gte: new Date('2026-11-01T00:00:00Z') },
            },
          },
          {
            $group: {
              _id: '$buildingId',
              mtdKwh: { $sum: '$consumptionKwh' },
              mtdCost: { $sum: '$estimatedCost' },
            },
          },
        ])
        .toArray(),
    ]);

    const floorMap = new Map(floorCounts.map((f) => [String(f._id), f.count]));
    const meterMap = new Map(meterCounts.map((m) => [String(m._id), m.count]));
    const usageMap = new Map(usageStats.map((u) => [String(u._id), u]));

    const items = buildings.map((b) => {
      const usage = usageMap.get(String(b._id));
      return {
        ...b,
        floorsCount: floorMap.get(String(b._id)) || 0,
        metersCount: meterMap.get(String(b._id)) || 0,
        mtdKwh: Number((usage?.mtdKwh || 0).toFixed(1)),
        mtdCost: Number((usage?.mtdCost || 0).toFixed(2)),
      };
    });

    res.json({ buildings: items });
  } catch (err) {
    next(err);
  }
});

router.post('/buildings', requireRole('Organization Admin'), async (req, res, next) => {
  try {
    const parsed = buildingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid building data' });
    }
    const db = await getDb();
    const doc = {
      _id: new ObjectId(),
      organizationId: req.user.organizationId,
      ...parsed.data,
      createdAt: new Date(),
    };
    await db.collection('buildings').insertOne(doc);
    res.status(201).json({ building: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Building code already exists' });
    next(err);
  }
});

router.patch('/buildings/:id', requireRole('Organization Admin'), async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id, 'buildingId');
    const parsed = buildingSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid building data' });
    }
    const db = await getDb();
    const updated = await db
      .collection('buildings')
      .findOneAndUpdate(
        { _id: id, organizationId: req.user.organizationId },
        { $set: parsed.data },
        { returnDocument: 'after' }
      );
    if (!updated) return res.status(404).json({ error: 'Building not found' });
    res.json({ building: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/buildings/:id', requireRole('Organization Admin'), async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id, 'buildingId');
    const db = await getDb();
    const result = await db.collection('buildings').deleteOne({ _id: id, organizationId: req.user.organizationId });
    if (!result.deletedCount) return res.status(404).json({ error: 'Building not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 3. Floors CRUD
router.get('/floors', async (req, res, next) => {
  try {
    const db = await getDb();
    const filter = { organizationId: req.user.organizationId };
    if (req.query.buildingId && req.query.buildingId !== 'all') {
      filter.buildingId = toObjectId(req.query.buildingId, 'buildingId');
    }
    const [floors, buildings, depts] = await Promise.all([
      db.collection('floors').find(filter).sort({ buildingId: 1, floorNumber: 1 }).toArray(),
      db.collection('buildings').find({ organizationId: req.user.organizationId }).toArray(),
      db.collection('departments').find({ organizationId: req.user.organizationId }).toArray(),
    ]);

    const bMap = new Map(buildings.map((b) => [String(b._id), b.name]));
    const deptCounts = new Map();
    for (const d of depts) {
      const k = String(d.floorId);
      deptCounts.set(k, (deptCounts.get(k) || 0) + 1);
    }

    const items = floors.map((f) => ({
      ...f,
      buildingName: bMap.get(String(f.buildingId)) || 'Unknown Building',
      departmentsCount: deptCounts.get(String(f._id)) || 0,
    }));

    res.json({ floors: items });
  } catch (err) {
    next(err);
  }
});

router.post('/floors', requireRole('Organization Admin'), async (req, res, next) => {
  try {
    const parsed = floorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid floor data' });
    }
    const db = await getDb();
    const buildingId = toObjectId(parsed.data.buildingId, 'buildingId');
    const building = await db.collection('buildings').findOne({ _id: buildingId, organizationId: req.user.organizationId });
    if (!building) return res.status(404).json({ error: 'Parent building not found in organization' });

    const doc = {
      _id: new ObjectId(),
      organizationId: req.user.organizationId,
      buildingId,
      floorNumber: parsed.data.floorNumber,
      name: parsed.data.name,
      areaSqFt: parsed.data.areaSqFt,
      createdAt: new Date(),
    };
    await db.collection('floors').insertOne(doc);
    res.status(201).json({ floor: { ...doc, buildingName: building.name } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Floor number already exists in this building' });
    next(err);
  }
});

router.delete('/floors/:id', requireRole('Organization Admin'), async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id, 'floorId');
    const db = await getDb();
    const resDel = await db.collection('floors').deleteOne({ _id: id, organizationId: req.user.organizationId });
    if (!resDel.deletedCount) return res.status(404).json({ error: 'Floor not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 4. Departments CRUD (Department Manager sees only assigned departments)
router.get('/departments', async (req, res, next) => {
  try {
    const db = await getDb();
    const baseFilter = { organizationId: req.user.organizationId };
    if (req.user.role === 'Department Manager') {
      baseFilter._id = { $in: req.user.departmentIds };
    }
    if (req.query.buildingId && req.query.buildingId !== 'all') {
      baseFilter.buildingId = toObjectId(req.query.buildingId, 'buildingId');
    }
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(req.query.q), 'i');
      baseFilter.$or = [{ name: rx }, { code: rx }, { costCenter: rx }];
    }

    const [departments, buildings, floors, usageStats] = await Promise.all([
      db.collection('departments').find(baseFilter).sort({ name: 1 }).toArray(),
      db.collection('buildings').find({ organizationId: req.user.organizationId }).toArray(),
      db.collection('floors').find({ organizationId: req.user.organizationId }).toArray(),
      db
        .collection('energy_records')
        .aggregate([
          {
            $match: {
              organizationId: req.user.organizationId,
              timestamp: { $gte: new Date('2026-11-01T00:00:00Z') },
            },
          },
          {
            $group: {
              _id: '$departmentId',
              mtdKwh: { $sum: '$consumptionKwh' },
              mtdCost: { $sum: '$estimatedCost' },
            },
          },
        ])
        .toArray(),
    ]);

    const bMap = new Map(buildings.map((b) => [String(b._id), b.name]));
    const fMap = new Map(floors.map((f) => [String(f._id), f.name]));
    const uMap = new Map(usageStats.map((u) => [String(u._id), u]));

    const items = departments.map((d) => {
      const u = uMap.get(String(d._id));
      return {
        ...d,
        buildingName: bMap.get(String(d.buildingId)) || 'Unknown',
        floorName: fMap.get(String(d.floorId)) || 'Unknown',
        mtdKwh: Number((u?.mtdKwh || 0).toFixed(1)),
        mtdCost: Number((u?.mtdCost || 0).toFixed(2)),
      };
    });

    res.json({ departments: items });
  } catch (err) {
    next(err);
  }
});

router.post('/departments', requireRole('Organization Admin'), async (req, res, next) => {
  try {
    const parsed = departmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid department data' });
    }
    const db = await getDb();
    const buildingId = toObjectId(parsed.data.buildingId, 'buildingId');
    const floorId = toObjectId(parsed.data.floorId, 'floorId');

    const floor = await db
      .collection('floors')
      .findOne({ _id: floorId, buildingId, organizationId: req.user.organizationId });
    if (!floor) return res.status(404).json({ error: 'Floor not found in selected building' });

    const doc = {
      _id: new ObjectId(),
      organizationId: req.user.organizationId,
      buildingId,
      floorId,
      name: parsed.data.name,
      code: parsed.data.code,
      costCenter: parsed.data.costCenter,
      monthlyBudgetUsd: parsed.data.monthlyBudgetUsd,
      headcount: parsed.data.headcount,
      createdAt: new Date(),
    };
    await db.collection('departments').insertOne(doc);
    res.status(201).json({ department: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Department code already exists' });
    next(err);
  }
});

router.patch('/departments/:id', requireRole('Organization Admin'), async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id, 'departmentId');
    const parsed = departmentSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid department update' });
    }
    const db = await getDb();
    const updated = await db
      .collection('departments')
      .findOneAndUpdate(
        { _id: id, organizationId: req.user.organizationId },
        { $set: parsed.data },
        { returnDocument: 'after' }
      );
    if (!updated) return res.status(404).json({ error: 'Department not found' });
    res.json({ department: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/departments/:id', requireRole('Organization Admin'), async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id, 'departmentId');
    const db = await getDb();
    const resDel = await db.collection('departments').deleteOne({ _id: id, organizationId: req.user.organizationId });
    if (!resDel.deletedCount) return res.status(404).json({ error: 'Department not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// 5. Meters CRUD & Health Monitoring
router.get('/meters', async (req, res, next) => {
  try {
    const db = await getDb();
    const filter = scopeFilter(req);
    if (req.query.buildingId && req.query.buildingId !== 'all') {
      filter.buildingId = toObjectId(req.query.buildingId, 'buildingId');
    }
    if (req.query.healthStatus && req.query.healthStatus !== 'all') {
      filter.healthStatus = req.query.healthStatus;
    }
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(req.query.q), 'i');
      filter.$or = [{ meterCode: rx }, { name: rx }, { buildingName: rx }, { departmentName: rx }];
    }

    const meters = await db.collection('meters').find(filter).sort({ meterCode: 1 }).toArray();
    res.json({ meters });
  } catch (err) {
    next(err);
  }
});

router.post('/meters', requireRole('Organization Admin', 'Facility Manager'), async (req, res, next) => {
  try {
    const parsed = meterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid meter data' });
    }
    const db = await getDb();
    const buildingId = toObjectId(parsed.data.buildingId, 'buildingId');
    const floorId = toObjectId(parsed.data.floorId, 'floorId');
    const departmentId = toObjectId(parsed.data.departmentId, 'departmentId');

    const [org, building, dept] = await Promise.all([
      db.collection('organizations').findOne({ _id: req.user.organizationId }),
      db.collection('buildings').findOne({ _id: buildingId, organizationId: req.user.organizationId }),
      db.collection('departments').findOne({ _id: departmentId, organizationId: req.user.organizationId }),
    ]);

    if (!building || !dept) {
      return res.status(404).json({ error: 'Referenced building or department not found in organization' });
    }

    const doc = {
      _id: new ObjectId(),
      organizationId: req.user.organizationId,
      buildingId,
      buildingName: building.name,
      floorId,
      departmentId,
      departmentName: dept.name,
      tariffPerKwh: parsed.data.tariffPerKwh || org?.tariffPerKwh || 0.145,
      emissionFactorKgPerKwh: org?.emissionFactorKgPerKwh || 0.412,
      meterCode: parsed.data.meterCode,
      name: parsed.data.name,
      meterType: parsed.data.meterType,
      unit: 'kWh',
      ratedCapacityKw: parsed.data.ratedCapacityKw,
      baselineHourlyKwh: parsed.data.baselineHourlyKwh,
      thresholdHourlyKwh: parsed.data.thresholdHourlyKwh,
      healthStatus: parsed.data.healthStatus,
      voltage: 480.0,
      powerFactor: 0.96,
      lastReadingAt: new Date(),
      createdAt: new Date(),
    };

    await db.collection('meters').insertOne(doc);
    res.status(201).json({ meter: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Meter code already exists' });
    next(err);
  }
});

router.patch('/meters/:id', requireRole('Organization Admin', 'Facility Manager'), async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id, 'meterId');
    const parsed = meterSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid meter update' });
    }
    const db = await getDb();
    const updated = await db
      .collection('meters')
      .findOneAndUpdate(
        { _id: id, organizationId: req.user.organizationId },
        { $set: parsed.data },
        { returnDocument: 'after' }
      );
    if (!updated) return res.status(404).json({ error: 'Meter not found' });
    res.json({ meter: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/meters/:id', requireRole('Organization Admin', 'Facility Manager'), async (req, res, next) => {
  try {
    const id = toObjectId(req.params.id, 'meterId');
    const db = await getDb();
    const resDel = await db.collection('meters').deleteOne({ _id: id, organizationId: req.user.organizationId });
    if (!resDel.deletedCount) return res.status(404).json({ error: 'Meter not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
