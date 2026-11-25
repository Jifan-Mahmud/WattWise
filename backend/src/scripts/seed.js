const { ObjectId } = require('mongodb');
const { connectDb, closeDb } = require('../config/db');
const { computeEnergyMetrics } = require('../utils/calculations');

const ANCHOR_NOW = new Date('2026-11-25T14:00:00.000Z');

// Deterministic PRNG (Mulberry32) so seeded charts and numbers are reproducible and natural
function createRng(seed = 20261125) {
  let a = seed;
  return function next() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildTimestamps() {
  const timestamps = [];
  // Sep 1 to Sep 30: every 6 hours (30 * 4 = 120)
  for (let d = 1; d <= 30; d++) {
    for (let h = 0; h < 24; h += 6) {
      timestamps.push(new Date(Date.UTC(2026, 8, d, h, 0, 0)));
    }
  }
  // Oct 1 to Oct 31: every 3 hours (31 * 8 = 248)
  for (let d = 1; d <= 31; d++) {
    for (let h = 0; h < 24; h += 3) {
      timestamps.push(new Date(Date.UTC(2026, 9, d, h, 0, 0)));
    }
  }
  // Nov 1 to Nov 20: every 2 hours (20 * 12 = 240)
  for (let d = 1; d <= 20; d++) {
    for (let h = 0; h < 24; h += 2) {
      timestamps.push(new Date(Date.UTC(2026, 10, d, h, 0, 0)));
    }
  }
  // Nov 21 to Nov 25 14:00: every 1 hour (4 * 24 + 15 = 111 -> total 719)
  // Add Nov 20 23:00 to make clean 720 per meter (84 * 720 = 60,480)
  timestamps.push(new Date(Date.UTC(2026, 10, 20, 23, 0, 0)));
  for (let d = 21; d <= 24; d++) {
    for (let h = 0; h < 24; h += 1) {
      timestamps.push(new Date(Date.UTC(2026, 10, d, h, 0, 0)));
    }
  }
  for (let h = 0; h <= 14; h += 1) {
    timestamps.push(new Date(Date.UTC(2026, 10, 25, h, 0, 0)));
  }

  return timestamps.sort((a, b) => a.getTime() - b.getTime());
}

async function seed() {
  const startMs = Date.now();
  const rng = createRng(42069);
  const { db } = await connectDb();

  console.log('Connected to MongoDB. Clearing existing WattWise domain collections...');
  const collections = [
    'organizations',
    'buildings',
    'floors',
    'departments',
    'meters',
    'energy_records',
    'alert_thresholds',
    'alerts',
    'wattwise_profiles',
    'energy_recommendations',
    'scheduled_reports',
  ];

  await Promise.all(collections.map((c) => db.collection(c).deleteMany({})));

  // 1. Organizations (3)
  const orgTemplates = [
    {
      _id: new ObjectId(),
      name: 'Northgrid Commercial Holdings',
      slug: 'northgrid-commercial',
      industry: 'Commercial Real Estate',
      timezone: 'America/New_York',
      currency: 'USD',
      tariffPerKwh: 0.145,
      emissionFactorKgPerKwh: 0.412,
      contactEmail: 'ops@northgrid.io',
      buildings: [
        { name: 'Northgrid Tower A', code: 'NG-TWR-A', address: '420 Lexington Ave', city: 'New York', sqFt: 480000, target: 310000 },
        { name: 'Meridian Plaza', code: 'NG-MRD-B', address: '185 Franklin St', city: 'Boston', sqFt: 320000, target: 220000 },
        { name: 'Harbor Exchange', code: 'NG-HRB-C', address: '90 Water St', city: 'New York', sqFt: 295000, target: 195000 },
        { name: 'Vanguard Logistics Hub', code: 'NG-VNG-D', address: '710 Port Newark Way', city: 'Newark', sqFt: 540000, target: 355000 },
        { name: 'Central Data Annex', code: 'NG-CDA-E', address: '14 Hudson Blvd', city: 'Jersey City', sqFt: 165000, target: 280000 },
      ],
    },
    {
      _id: new ObjectId(),
      name: 'Apex Semiconductor Fab',
      slug: 'apex-semiconductor',
      industry: 'Industrial Manufacturing',
      timezone: 'America/Phoenix',
      currency: 'USD',
      tariffPerKwh: 0.118,
      emissionFactorKgPerKwh: 0.455,
      contactEmail: 'facilities@apexfab.io',
      buildings: [
        { name: 'Fab Cleanroom 01', code: 'AP-CLN-01', address: '2100 Silicon Pkwy', city: 'Chandler', sqFt: 410000, target: 490000 },
        { name: 'Wafer Packaging Hall', code: 'AP-WFR-02', address: '2120 Silicon Pkwy', city: 'Chandler', sqFt: 260000, target: 270000 },
        { name: 'R&D Cryo Lab', code: 'AP-LAB-03', address: '2150 Silicon Pkwy', city: 'Tempe', sqFt: 145000, target: 185000 },
        { name: 'Utility Substation West', code: 'AP-SUB-04', address: '2190 Silicon Pkwy', city: 'Chandler', sqFt: 98000, target: 160000 },
      ],
    },
    {
      _id: new ObjectId(),
      name: 'Metro University Campus',
      slug: 'metro-university',
      industry: 'Higher Education',
      timezone: 'America/Chicago',
      currency: 'USD',
      tariffPerKwh: 0.132,
      emissionFactorKgPerKwh: 0.385,
      contactEmail: 'sustainability@metro.edu',
      buildings: [
        { name: 'Engineering Quad', code: 'MU-ENG-01', address: '400 Campus Dr', city: 'Chicago', sqFt: 350000, target: 240000 },
        { name: 'Science & Robotics Center', code: 'MU-SCI-02', address: '440 Campus Dr', city: 'Chicago', sqFt: 280000, target: 215000 },
        { name: 'Central Library Commons', code: 'MU-LIB-03', address: '480 Campus Dr', city: 'Chicago', sqFt: 210000, target: 150000 },
      ],
    },
  ];

  const orgDocs = orgTemplates.map((o) => ({
    _id: o._id,
    name: o.name,
    slug: o.slug,
    industry: o.industry,
    timezone: o.timezone,
    currency: o.currency,
    tariffPerKwh: o.tariffPerKwh,
    emissionFactorKgPerKwh: o.emissionFactorKgPerKwh,
    contactEmail: o.contactEmail,
    createdAt: ANCHOR_NOW,
    updatedAt: ANCHOR_NOW,
  }));
  await db.collection('organizations').insertMany(orgDocs);

  const floorNames = ['Level 01 - Mechanical & Lobby', 'Level 02 - Operations Floor', 'Level 03 - Executive & Compute'];
  const deptTemplates = [
    { name: 'HVAC & Air Handling', prefix: 'HVAC', meterType: 'HVAC', base: 44, budget: 18500 },
    { name: 'Chiller Plant Loop', prefix: 'CHLR', meterType: 'Chiller', base: 62, budget: 24000 },
    { name: 'Core Server & Network', prefix: 'SRVR', meterType: 'Server Room', base: 54, budget: 21000 },
    { name: 'Floor Lighting & Atrium', prefix: 'LGHT', meterType: 'Lighting', base: 22, budget: 8200 },
    { name: 'Production & Workstations', prefix: 'PROD', meterType: 'Production', base: 39, budget: 15400 },
  ];

  const buildingDocs = [];
  const floorDocs = [];
  const departmentDocs = [];
  const meterDocs = [];

  for (const org of orgTemplates) {
    for (let bIdx = 0; bIdx < org.buildings.length; bIdx++) {
      const b = org.buildings[bIdx];
      const buildingId = new ObjectId();
      buildingDocs.push({
        _id: buildingId,
        organizationId: org._id,
        name: b.name,
        code: b.code,
        address: b.address,
        city: b.city,
        totalSqFt: b.sqFt,
        targetMonthlyKwh: b.target,
        status: bIdx === 3 && org.slug === 'northgrid-commercial' ? 'Maintenance' : 'Operational',
        createdAt: ANCHOR_NOW,
      });

      const bFloors = [];
      for (let f = 1; f <= 3; f++) {
        const floorId = new ObjectId();
        const fDoc = {
          _id: floorId,
          organizationId: org._id,
          buildingId,
          floorNumber: f,
          name: floorNames[f - 1],
          areaSqFt: Math.round(b.sqFt / 3),
          createdAt: ANCHOR_NOW,
        };
        floorDocs.push(fDoc);
        bFloors.push(fDoc);
      }

      // 5 departments per building (total 60)
      const bDepts = [];
      for (let dIdx = 0; dIdx < 5; dIdx++) {
        const tmpl = deptTemplates[dIdx];
        const floor = bFloors[dIdx % 3];
        const deptId = new ObjectId();
        const dDoc = {
          _id: deptId,
          organizationId: org._id,
          buildingId,
          floorId: floor._id,
          name: `${tmpl.name}`,
          code: `${b.code}-${tmpl.prefix}`,
          costCenter: `CC-${org.slug.slice(0, 3).toUpperCase()}-${bIdx + 1}0${dIdx + 1}`,
          monthlyBudgetUsd: tmpl.budget,
          headcount: 25 + Math.floor(rng() * 85),
          createdAt: ANCHOR_NOW,
        };
        departmentDocs.push(dDoc);
        bDepts.push({ doc: dDoc, tmpl });
      }

      // 7 meters per building (total 84)
      for (let mIdx = 0; mIdx < 7; mIdx++) {
        const deptPair = bDepts[mIdx % 5];
        const meterType = mIdx === 5 ? 'Main Feeder' : mIdx === 6 ? 'HVAC' : deptPair.tmpl.meterType;
        const baseKwh = mIdx === 5 ? 95 + rng() * 35 : deptPair.tmpl.base * (0.82 + rng() * 0.45);
        const thresholdHourlyKwh = Number((baseKwh * 1.55).toFixed(1));
        const meterId = new ObjectId();
        const rollHealth = rng();
        const healthStatus = rollHealth > 0.96 ? 'Offline' : rollHealth > 0.90 ? 'Degraded' : 'Healthy';

        meterDocs.push({
          _id: meterId,
          organizationId: org._id,
          buildingId,
          buildingName: b.name,
          floorId: deptPair.doc.floorId,
          departmentId: deptPair.doc._id,
          departmentName: deptPair.doc.name,
          tariffPerKwh: org.tariffPerKwh,
          emissionFactorKgPerKwh: org.emissionFactorKgPerKwh,
          meterCode: `MTR-${b.code}-${String(mIdx + 1).padStart(2, '0')}`,
          name: `${b.code} ${meterType} Meter ${mIdx + 1}`,
          meterType,
          unit: 'kWh',
          ratedCapacityKw: Math.round(thresholdHourlyKwh * 1.45),
          baselineHourlyKwh: Number(baseKwh.toFixed(2)),
          thresholdHourlyKwh,
          healthStatus,
          voltage: Number((477 + rng() * 6).toFixed(1)),
          powerFactor: Number((0.92 + rng() * 0.06).toFixed(2)),
          lastReadingAt: ANCHOR_NOW,
          createdAt: ANCHOR_NOW,
        });
      }
    }
  }

  await db.collection('buildings').insertMany(buildingDocs);
  await db.collection('floors').insertMany(floorDocs);
  await db.collection('departments').insertMany(departmentDocs);
  await db.collection('meters').insertMany(meterDocs);

  console.log(
    `Inserted ${orgDocs.length} orgs, ${buildingDocs.length} buildings, ${floorDocs.length} floors, ${departmentDocs.length} departments, ${meterDocs.length} meters.`
  );

  // 2. Energy Records (84 * 720 = 60,480 records)
  const timestamps = buildTimestamps();
  console.log(`Generating ${meterDocs.length * timestamps.length} energy records across ${timestamps.length} timestamps...`);

  const BATCH_SIZE = 5000;
  let batch = [];
  let totalInserted = 0;
  const anomalySamples = [];

  for (let mIdx = 0; mIdx < meterDocs.length; mIdx++) {
    const m = meterDocs[mIdx];
    const isContinuous = m.meterType === 'Server Room' || m.meterType === 'Chiller';

    for (let tIdx = 0; tIdx < timestamps.length; tIdx++) {
      const ts = timestamps[tIdx];
      const hour = ts.getUTCHours();
      const dayOfWeek = ts.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Realistic time-of-day factor
      let hourFactor = 0.45;
      if (isContinuous) {
        hourFactor = hour >= 10 && hour <= 18 ? 1.05 : 0.88;
      } else if (hour >= 8 && hour <= 18) {
        hourFactor = 1.18 + Math.sin(((hour - 8) / 10) * Math.PI) * 0.24;
      } else if (hour >= 19 && hour <= 22) {
        hourFactor = 0.72;
      }

      const weekendFactor = isWeekend && !isContinuous ? 0.62 : 1.0;
      // Slight seasonal cooling trend from Sep to Nov
      const month = ts.getUTCMonth();
      const monthFactor = month === 8 ? 1.08 : month === 9 ? 1.01 : 0.94;
      const noise = 0.86 + rng() * 0.28;

      let kwh = m.baselineHourlyKwh * hourFactor * weekendFactor * monthFactor * noise;

      // Intentional realistic anomalies (~0.8% of recent Nov readings or off-hours spikes)
      let isAnomaly = false;
      const isRecentNov = month === 10 && ts.getUTCDate() >= 18;
      if ((isRecentNov && rng() > 0.985) || (hour === 2 && mIdx % 11 === 0 && ts.getUTCDate() === 23)) {
        kwh = m.thresholdHourlyKwh * (1.14 + rng() * 0.38);
        isAnomaly = true;
      } else if (kwh > m.thresholdHourlyKwh) {
        isAnomaly = true;
      }

      const metrics = computeEnergyMetrics(kwh, m.tariffPerKwh, m.emissionFactorKgPerKwh);

      const doc = {
        organizationId: m.organizationId,
        buildingId: m.buildingId,
        floorId: m.floorId,
        departmentId: m.departmentId,
        meterId: m._id,
        meterCode: m.meterCode,
        buildingName: m.buildingName,
        departmentName: m.departmentName,
        consumptionKwh: metrics.consumptionKwh,
        demandKw: Number((metrics.consumptionKwh * (1.03 + rng() * 0.09)).toFixed(2)),
        powerFactor: m.powerFactor,
        estimatedCost: metrics.estimatedCost,
        carbonKg: metrics.carbonKg,
        timestamp: ts,
        isAnomaly,
        source: 'seeded',
        createdAt: ts,
      };

      batch.push(doc);

      if (isAnomaly && isRecentNov && anomalySamples.length < 18) {
        anomalySamples.push({ meter: m, record: doc });
      }

      if (batch.length >= BATCH_SIZE) {
        await db.collection('energy_records').insertMany(batch, { ordered: false });
        totalInserted += batch.length;
        batch = [];
      }
    }
  }

  if (batch.length > 0) {
    await db.collection('energy_records').insertMany(batch, { ordered: false });
    totalInserted += batch.length;
  }

  console.log(`Inserted ${totalInserted} energy records in ${((Date.now() - startMs) / 1000).toFixed(1)}s.`);

  // 3. Alert Thresholds (6 per org = 18)
  const thresholdDocs = [];
  for (const org of orgTemplates) {
    const orgBuildings = buildingDocs.filter((b) => b.organizationId.equals(org._id));
    thresholdDocs.push(
      {
        _id: new ObjectId(),
        organizationId: org._id,
        buildingId: null,
        meterId: null,
        name: 'Organization Hourly Peak Ceiling',
        metric: 'hourly_kwh',
        limitValue: 165,
        spikeMultiplier: 1.65,
        severity: 'High',
        enabled: true,
        createdBy: 'system-seed',
        createdAt: ANCHOR_NOW,
        updatedAt: ANCHOR_NOW,
      },
      {
        _id: new ObjectId(),
        organizationId: org._id,
        buildingId: orgBuildings[0]._id,
        meterId: null,
        name: `${orgBuildings[0].code} Off-Hours HVAC Guard`,
        metric: 'spike_ratio',
        limitValue: 85,
        spikeMultiplier: 1.55,
        severity: 'Medium',
        enabled: true,
        createdBy: 'system-seed',
        createdAt: ANCHOR_NOW,
        updatedAt: ANCHOR_NOW,
      }
    );
  }
  await db.collection('alert_thresholds').insertMany(thresholdDocs);

  // 4. Alerts (Real anomalies from seeded readings across New / Acknowledged / Resolved)
  const statuses = ['New', 'New', 'Acknowledged', 'Resolved'];
  const alertDocs = anomalySamples.map((item, idx) => {
    const status = statuses[idx % statuses.length];
    const hour = item.record.timestamp.getUTCHours();
    const isOffHours = hour < 6 || hour > 20;
    const severity = item.record.consumptionKwh > item.meter.thresholdHourlyKwh * 1.25 ? 'High' : 'Medium';

    return {
      _id: new ObjectId(),
      organizationId: item.meter.organizationId,
      buildingId: item.meter.buildingId,
      buildingName: item.meter.buildingName,
      floorId: item.meter.floorId,
      departmentId: item.meter.departmentId,
      departmentName: item.meter.departmentName,
      meterId: item.meter._id,
      meterCode: item.meter.meterCode,
      thresholdId: null,
      title: isOffHours
        ? `${item.meter.meterType} load spike during off-hours (${item.meter.meterCode})`
        : `${item.meter.buildingName} exceeded hourly threshold (${item.meter.meterCode})`,
      description: `Measured ${item.record.consumptionKwh} kWh against threshold ${item.meter.thresholdHourlyKwh} kWh at ${item.record.timestamp.toISOString().slice(0, 16).replace('T', ' ')} UTC.`,
      alertType: isOffHours ? 'Unusual Consumption' : 'High Usage',
      severity,
      status,
      measuredValue: item.record.consumptionKwh,
      thresholdValue: item.meter.thresholdHourlyKwh,
      unit: 'kWh',
      triggeredAt: item.record.timestamp,
      acknowledgedBy: status !== 'New' ? 'Marcus Vance (Facility Mgr)' : null,
      acknowledgedAt: status !== 'New' ? ANCHOR_NOW : null,
      resolvedBy: status === 'Resolved' ? 'Marcus Vance (Facility Mgr)' : null,
      resolvedAt: status === 'Resolved' ? ANCHOR_NOW : null,
    };
  });

  // Ensure Northgrid Commercial always has rich alerts across statuses
  const ngMeters = meterDocs.filter((m) => m.organizationId.equals(orgDocs[0]._id));
  const extraNgAlerts = [
    {
      _id: new ObjectId(),
      organizationId: orgDocs[0]._id,
      buildingId: ngMeters[0].buildingId,
      buildingName: ngMeters[0].buildingName,
      floorId: ngMeters[0].floorId,
      departmentId: ngMeters[0].departmentId,
      departmentName: ngMeters[0].departmentName,
      meterId: ngMeters[0]._id,
      meterCode: ngMeters[0].meterCode,
      thresholdId: null,
      title: 'Chiller staging spike after 19:00 UTC',
      description: 'Measured 118.4 kWh vs 74.2 kWh baseline during low-occupancy window.',
      alertType: 'Unusual Consumption',
      severity: 'High',
      status: 'New',
      measuredValue: 118.4,
      thresholdValue: 74.2,
      unit: 'kWh',
      triggeredAt: new Date('2026-11-25T09:00:00.000Z'),
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedBy: null,
      resolvedAt: null,
    },
    {
      _id: new ObjectId(),
      organizationId: orgDocs[0]._id,
      buildingId: ngMeters[8].buildingId,
      buildingName: ngMeters[8].buildingName,
      floorId: ngMeters[8].floorId,
      departmentId: ngMeters[8].departmentId,
      departmentName: ngMeters[8].departmentName,
      meterId: ngMeters[8]._id,
      meterCode: ngMeters[8].meterCode,
      thresholdId: null,
      title: 'Power factor drop below 0.90 on Feeder 02',
      description: 'Reactive load drift detected on Meridian Plaza condenser loop.',
      alertType: 'Meter Health',
      severity: 'Medium',
      status: 'Acknowledged',
      measuredValue: 0.87,
      thresholdValue: 0.92,
      unit: 'PF',
      triggeredAt: new Date('2026-11-24T17:00:00.000Z'),
      acknowledgedBy: 'Marcus Vance',
      acknowledgedAt: new Date('2026-11-24T18:10:00.000Z'),
      resolvedBy: null,
      resolvedAt: null,
    },
    {
      _id: new ObjectId(),
      organizationId: orgDocs[0]._id,
      buildingId: ngMeters[15].buildingId,
      buildingName: ngMeters[15].buildingName,
      floorId: ngMeters[15].floorId,
      departmentId: ngMeters[15].departmentId,
      departmentName: ngMeters[15].departmentName,
      meterId: ngMeters[15]._id,
      meterCode: ngMeters[15].meterCode,
      thresholdId: null,
      title: 'Atrium lighting override remained active overnight',
      description: 'Resolved by resetting BMS lighting schedule zone 3.',
      alertType: 'High Usage',
      severity: 'Low',
      status: 'Resolved',
      measuredValue: 41.2,
      thresholdValue: 28.0,
      unit: 'kWh',
      triggeredAt: new Date('2026-11-23T03:00:00.000Z'),
      acknowledgedBy: 'Elena Rostova',
      acknowledgedAt: new Date('2026-11-23T07:30:00.000Z'),
      resolvedBy: 'Marcus Vance',
      resolvedAt: new Date('2026-11-23T08:15:00.000Z'),
    },
  ];
  await db.collection('alerts').insertMany([...extraNgAlerts, ...alertDocs]);

  // 5. Energy Recommendations
  const recTemplates = [
    {
      title: 'Enable HVAC night setback schedule after 19:30',
      category: 'HVAC',
      summary: 'Air handling units in Northgrid Tower A maintain 68% daytime flow until midnight despite <8% occupancy.',
      savingsUsd: 2480,
      kwhReduction: 17100,
    },
    {
      title: 'Shift chilled-water thermal pre-cooling off peak tariff',
      category: 'Peak Shifting',
      summary: 'Pre-cooling Meridian Plaza between 04:00 and 06:30 trims afternoon peak demand charges by 14%.',
      savingsUsd: 1890,
      kwhReduction: 11400,
    },
    {
      title: 'Calibrate Server Room CRAC economizer dampers',
      category: 'Equipment',
      summary: 'Central Data Annex cold-aisle intake is running mechanical DX cooling while outdoor ambient is 9°C.',
      savingsUsd: 3120,
      kwhReduction: 21500,
    },
    {
      title: 'Enforce occupancy daylight dimming on Level 02',
      category: 'Lighting',
      summary: 'Perimeter lighting circuits stay at 100% intensity during peak midday solar gain.',
      savingsUsd: 940,
      kwhReduction: 6480,
    },
  ];

  const recDocs = [];
  for (const org of orgTemplates) {
    const orgB = buildingDocs.filter((b) => b.organizationId.equals(org._id));
    const orgD = departmentDocs.filter((d) => d.organizationId.equals(org._id));
    for (let i = 0; i < recTemplates.length; i++) {
      const r = recTemplates[i];
      recDocs.push({
        _id: new ObjectId(),
        organizationId: org._id,
        buildingId: orgB[i % orgB.length]._id,
        buildingName: orgB[i % orgB.length].name,
        departmentId: orgD[i % orgD.length]._id,
        departmentName: orgD[i % orgD.length].name,
        title: r.title,
        category: r.category,
        summary: r.summary,
        estimatedMonthlySavingsUsd: r.savingsUsd,
        estimatedKwhReduction: r.kwhReduction,
        status: i === 3 ? 'Accepted' : 'Open',
        createdAt: ANCHOR_NOW,
      });
    }
  }
  await db.collection('energy_recommendations').insertMany(recDocs);

  // 6. Scheduled Reports
  const reportDocs = [
    {
      _id: new ObjectId(),
      organizationId: orgDocs[0]._id,
      name: 'Weekly Executive Energy & Cost Digest',
      frequency: 'Weekly',
      format: 'PDF',
      recipients: ['admin@wattwise.io', 'cfo@northgrid.io'],
      buildingId: null,
      lastSentAt: new Date('2026-11-23T08:00:00.000Z'),
      nextRunAt: new Date('2026-11-30T08:00:00.000Z'),
      enabled: true,
      createdBy: 'admin@wattwise.io',
      createdAt: ANCHOR_NOW,
    },
    {
      _id: new ObjectId(),
      organizationId: orgDocs[0]._id,
      name: 'Daily Sub-Meter Anomaly Telemetry CSV',
      frequency: 'Daily',
      format: 'CSV',
      recipients: ['facility@wattwise.io'],
      buildingId: buildingDocs[0]._id,
      lastSentAt: new Date('2026-11-25T06:00:00.000Z'),
      nextRunAt: new Date('2026-11-26T06:00:00.000Z'),
      enabled: true,
      createdBy: 'facility@wattwise.io',
      createdAt: ANCHOR_NOW,
    },
    {
      _id: new ObjectId(),
      organizationId: orgDocs[0]._id,
      name: 'Monthly Scope 2 Carbon Accounting Ledger',
      frequency: 'Monthly',
      format: 'PDF',
      recipients: ['esg@northgrid.io'],
      buildingId: null,
      lastSentAt: new Date('2026-11-01T07:00:00.000Z'),
      nextRunAt: new Date('2026-12-01T07:00:00.000Z'),
      enabled: true,
      createdBy: 'admin@wattwise.io',
      createdAt: ANCHOR_NOW,
    },
  ];
  await db.collection('scheduled_reports').insertMany(reportDocs);

  // 7. RBAC Profiles for the 4 Roles (linked by email to Better Auth users)
  const ngFirstDepts = departmentDocs
    .filter((d) => d.organizationId.equals(orgDocs[0]._id))
    .slice(0, 2)
    .map((d) => d._id);

  const profileDocs = [
    {
      _id: new ObjectId(),
      email: 'admin@wattwise.io',
      name: 'Elena Rostova',
      organizationId: orgDocs[0]._id,
      role: 'Organization Admin',
      departmentIds: [],
      themePreference: 'dark',
      timezone: 'America/New_York',
      status: 'Active',
      createdAt: ANCHOR_NOW,
      updatedAt: ANCHOR_NOW,
    },
    {
      _id: new ObjectId(),
      email: 'facility@wattwise.io',
      name: 'Marcus Vance',
      organizationId: orgDocs[0]._id,
      role: 'Facility Manager',
      departmentIds: [],
      themePreference: 'dark',
      timezone: 'America/New_York',
      status: 'Active',
      createdAt: ANCHOR_NOW,
      updatedAt: ANCHOR_NOW,
    },
    {
      _id: new ObjectId(),
      email: 'dept@wattwise.io',
      name: 'Nadia Chen',
      organizationId: orgDocs[0]._id,
      role: 'Department Manager',
      departmentIds: ngFirstDepts,
      themePreference: 'dark',
      timezone: 'America/New_York',
      status: 'Active',
      createdAt: ANCHOR_NOW,
      updatedAt: ANCHOR_NOW,
    },
    {
      _id: new ObjectId(),
      email: 'viewer@wattwise.io',
      name: 'Tariq Al-Mansoor',
      organizationId: orgDocs[0]._id,
      role: 'Viewer',
      departmentIds: [],
      themePreference: 'light',
      timezone: 'America/New_York',
      status: 'Active',
      createdAt: ANCHOR_NOW,
      updatedAt: ANCHOR_NOW,
    },
    {
      _id: new ObjectId(),
      email: 'ops@apexfab.io',
      name: 'Kenji Takahashi',
      organizationId: orgDocs[1]._id,
      role: 'Organization Admin',
      departmentIds: [],
      themePreference: 'dark',
      timezone: 'America/Phoenix',
      status: 'Active',
      createdAt: ANCHOR_NOW,
      updatedAt: ANCHOR_NOW,
    },
    {
      _id: new ObjectId(),
      email: 'sustainability@metro.edu',
      name: 'Dr. Clara Lindqvist',
      organizationId: orgDocs[2]._id,
      role: 'Organization Admin',
      departmentIds: [],
      themePreference: 'light',
      timezone: 'America/Chicago',
      status: 'Active',
      createdAt: ANCHOR_NOW,
      updatedAt: ANCHOR_NOW,
    },
  ];
  await db.collection('wattwise_profiles').insertMany(profileDocs);

  console.log('Seed completed successfully!');
  await closeDb();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
