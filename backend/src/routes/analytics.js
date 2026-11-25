const express = require('express');
const { getDb } = require('../config/db');
const { scopeFilter } = require('../middleware/auth');
const { parseDateRange, applyDimensionFilters } = require('../utils/dateRange');

const router = express.Router();

// 1. Organization Dashboard Overview (KPIs + Daily Chart + Building/Dept/Meter Breakdown + Alerts)
router.get('/dashboard/overview', async (req, res, next) => {
  try {
    const db = await getDb();
    const { start, end, prevStart, prevEnd } = parseDateRange(req.query);

    let matchCurrent = scopeFilter(req, { timestamp: { $gte: start, $lte: end } });
    matchCurrent = applyDimensionFilters(matchCurrent, req.query);

    let matchPrev = scopeFilter(req, { timestamp: { $gte: prevStart, $lte: prevEnd } });
    matchPrev = applyDimensionFilters(matchPrev, req.query);

    const [currentAgg, prevAgg, activeAlerts, meterStats] = await Promise.all([
      db
        .collection('energy_records')
        .aggregate([
          { $match: matchCurrent },
          {
            $facet: {
              summary: [
                {
                  $group: {
                    _id: null,
                    totalKwh: { $sum: '$consumptionKwh' },
                    totalCost: { $sum: '$estimatedCost' },
                    totalCarbonKg: { $sum: '$carbonKg' },
                    peakKwh: { $max: '$consumptionKwh' },
                    lowestKwh: { $min: '$consumptionKwh' },
                    recordCount: { $sum: 1 },
                    anomalyCount: { $sum: { $cond: ['$isAnomaly', 1, 0] } },
                  },
                },
              ],
              dailySeries: [
                {
                  $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                    totalKwh: { $sum: '$consumptionKwh' },
                    totalCost: { $sum: '$estimatedCost' },
                    anomalies: { $sum: { $cond: ['$isAnomaly', 1, 0] } },
                  },
                },
                { $sort: { _id: 1 } },
              ],
              buildingBreakdown: [
                {
                  $group: {
                    _id: '$buildingId',
                    name: { $first: '$buildingName' },
                    totalKwh: { $sum: '$consumptionKwh' },
                    totalCost: { $sum: '$estimatedCost' },
                    anomalies: { $sum: { $cond: ['$isAnomaly', 1, 0] } },
                  },
                },
                { $sort: { totalKwh: -1 } },
              ],
              departmentBreakdown: [
                {
                  $group: {
                    _id: '$departmentId',
                    name: { $first: '$departmentName' },
                    totalKwh: { $sum: '$consumptionKwh' },
                    totalCost: { $sum: '$estimatedCost' },
                  },
                },
                { $sort: { totalKwh: -1 } },
                { $limit: 10 },
              ],
              meterBreakdown: [
                {
                  $group: {
                    _id: '$meterId',
                    meterCode: { $first: '$meterCode' },
                    buildingName: { $first: '$buildingName' },
                    totalKwh: { $sum: '$consumptionKwh' },
                    totalCost: { $sum: '$estimatedCost' },
                    peakKwh: { $max: '$consumptionKwh' },
                  },
                },
                { $sort: { totalKwh: -1 } },
                { $limit: 8 },
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
        .collection('alerts')
        .find(scopeFilter(req, { status: { $in: ['New', 'Acknowledged'] } }))
        .sort({ triggeredAt: -1 })
        .limit(6)
        .toArray(),
      db
        .collection('meters')
        .aggregate([
          { $match: scopeFilter(req) },
          { $group: { _id: '$healthStatus', count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const facet = currentAgg[0] || {};
    const summary = facet.summary?.[0] || {
      totalKwh: 0,
      totalCost: 0,
      totalCarbonKg: 0,
      peakKwh: 0,
      lowestKwh: 0,
      recordCount: 0,
      anomalyCount: 0,
    };

    const daysCount = Math.max(1, facet.dailySeries?.length || 1);
    const prev = prevAgg[0] || { totalKwh: 0, totalCost: 0 };
    const deltaPct =
      prev.totalKwh > 0
        ? Number((((summary.totalKwh - prev.totalKwh) / prev.totalKwh) * 100).toFixed(1))
        : 0;

    const anomalyRatio = summary.recordCount > 0 ? summary.anomalyCount / summary.recordCount : 0;
    const efficiencyScore = Number(Math.max(60, Math.min(99.2, 96.4 - anomalyRatio * 240)).toFixed(1));

    const dailySeries = (facet.dailySeries || []).map((d) => ({
      date: d._id,
      label: d._id.slice(5),
      kwh: Number(d.totalKwh.toFixed(1)),
      cost: Number(d.totalCost.toFixed(2)),
      baseline: Number((summary.totalKwh / daysCount).toFixed(1)),
      anomalies: d.anomalies,
    }));

    const healthSummary = { Healthy: 0, Degraded: 0, Offline: 0 };
    for (const m of meterStats) {
      if (m._id in healthSummary) healthSummary[m._id] = m.count;
    }

    res.json({
      range: { start, end, prevStart, prevEnd },
      kpis: {
        totalKwh: Number(summary.totalKwh.toFixed(1)),
        totalCost: Number(summary.totalCost.toFixed(2)),
        totalCarbonKg: Number(summary.totalCarbonKg.toFixed(1)),
        avgDailyKwh: Number((summary.totalKwh / daysCount).toFixed(1)),
        peakKwh: Number((summary.peakKwh || 0).toFixed(2)),
        lowestKwh: Number((summary.lowestKwh || 0).toFixed(2)),
        recordCount: summary.recordCount,
        anomalyCount: summary.anomalyCount,
        prevPeriodKwh: Number(prev.totalKwh.toFixed(1)),
        prevPeriodCost: Number(prev.totalCost.toFixed(2)),
        deltaPct,
        efficiencyScore,
      },
      dailySeries,
      buildingBreakdown: (facet.buildingBreakdown || []).map((b) => ({
        ...b,
        totalKwh: Number(b.totalKwh.toFixed(1)),
        totalCost: Number(b.totalCost.toFixed(2)),
      })),
      departmentBreakdown: (facet.departmentBreakdown || []).map((d) => ({
        ...d,
        totalKwh: Number(d.totalKwh.toFixed(1)),
        totalCost: Number(d.totalCost.toFixed(2)),
      })),
      meterBreakdown: (facet.meterBreakdown || []).map((m) => ({
        ...m,
        totalKwh: Number(m.totalKwh.toFixed(1)),
        totalCost: Number(m.totalCost.toFixed(2)),
        peakKwh: Number(m.peakKwh.toFixed(2)),
      })),
      activeAlerts,
      meterHealth: healthSummary,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Detailed Analytics (Hourly, Daily, Monthly, Building & Dept Comparison, Cost Analysis, 7-day Forecast)
router.get('/analytics', async (req, res, next) => {
  try {
    const db = await getDb();
    const { start, end } = parseDateRange({
      preset: req.query.preset || '30d',
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    let matchPeriod = scopeFilter(req, { timestamp: { $gte: start, $lte: end } });
    matchPeriod = applyDimensionFilters(matchPeriod, req.query);

    let matchQuarter = scopeFilter(req, {
      timestamp: { $gte: new Date('2026-09-01T00:00:00.000Z'), $lte: end },
    });
    matchQuarter = applyDimensionFilters(matchQuarter, req.query);

    const [periodFacet, monthlyAgg, meters, buildings, departments] = await Promise.all([
      db
        .collection('energy_records')
        .aggregate([
          { $match: matchPeriod },
          {
            $facet: {
              hourly: [
                {
                  $group: {
                    _id: { $hour: '$timestamp' },
                    avgKwh: { $avg: '$consumptionKwh' },
                    peakKwh: { $max: '$consumptionKwh' },
                    totalKwh: { $sum: '$consumptionKwh' },
                  },
                },
                { $sort: { _id: 1 } },
              ],
              daily: [
                {
                  $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                    totalKwh: { $sum: '$consumptionKwh' },
                    totalCost: { $sum: '$estimatedCost' },
                    carbonKg: { $sum: '$carbonKg' },
                  },
                },
                { $sort: { _id: 1 } },
              ],
              byBuilding: [
                {
                  $group: {
                    _id: '$buildingId',
                    name: { $first: '$buildingName' },
                    totalKwh: { $sum: '$consumptionKwh' },
                    totalCost: { $sum: '$estimatedCost' },
                    carbonKg: { $sum: '$carbonKg' },
                  },
                },
                { $sort: { totalKwh: -1 } },
              ],
              byDepartment: [
                {
                  $group: {
                    _id: '$departmentId',
                    name: { $first: '$departmentName' },
                    totalKwh: { $sum: '$consumptionKwh' },
                    totalCost: { $sum: '$estimatedCost' },
                  },
                },
                { $sort: { totalKwh: -1 } },
                { $limit: 12 },
              ],
              byMeter: [
                {
                  $group: {
                    _id: '$meterId',
                    totalKwh: { $sum: '$consumptionKwh' },
                    totalCost: { $sum: '$estimatedCost' },
                  },
                },
              ],
            },
          },
        ])
        .toArray(),
      db
        .collection('energy_records')
        .aggregate([
          { $match: matchQuarter },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$timestamp' } },
              totalKwh: { $sum: '$consumptionKwh' },
              totalCost: { $sum: '$estimatedCost' },
              carbonKg: { $sum: '$carbonKg' },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
      db.collection('meters').find(scopeFilter(req)).toArray(),
      db.collection('buildings').find({ organizationId: req.user.organizationId }).toArray(),
      db.collection('departments').find({ organizationId: req.user.organizationId }).toArray(),
    ]);

    const facet = periodFacet[0] || {};
    const buildingMeta = new Map(buildings.map((b) => [String(b._id), b]));
    const deptMeta = new Map(departments.map((d) => [String(d._id), d]));
    const meterMeta = new Map(meters.map((m) => [String(m._id), m]));

    const costByTypeMap = new Map();
    for (const row of facet.byMeter || []) {
      const m = meterMeta.get(String(row._id));
      const type = m?.meterType || 'Other';
      const cur = costByTypeMap.get(type) || { category: type, totalKwh: 0, totalCost: 0 };
      cur.totalKwh += row.totalKwh;
      cur.totalCost += row.totalCost;
      costByTypeMap.set(type, cur);
    }

    const dailyUsage = (facet.daily || []).map((d) => ({
      date: d._id,
      label: d._id.slice(5),
      kwh: Number(d.totalKwh.toFixed(1)),
      cost: Number(d.totalCost.toFixed(2)),
      carbonKg: Number(d.carbonKg.toFixed(1)),
    }));

    // 7-day forward forecast from trailing 14-day slope
    const recentDays = dailyUsage.slice(-14);
    const avgRecent = recentDays.length
      ? recentDays.reduce((acc, cur) => acc + cur.kwh, 0) / recentDays.length
      : 0;
    const slope =
      recentDays.length >= 2
        ? (recentDays[recentDays.length - 1].kwh - recentDays[0].kwh) / recentDays.length
        : 0;

    const forecast = [];
    const lastDate = dailyUsage.length
      ? new Date(`${dailyUsage[dailyUsage.length - 1].date}T00:00:00Z`)
      : new Date(end);
    for (let i = 1; i <= 7; i++) {
      const d = new Date(lastDate.getTime() + i * 86400000);
      const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
      const projected = Math.max(0, (avgRecent + slope * i * 0.4) * (isWeekend ? 0.72 : 1.02));
      forecast.push({
        date: d.toISOString().slice(0, 10),
        label: d.toISOString().slice(5, 10),
        projectedKwh: Number(projected.toFixed(1)),
        lowerBound: Number((projected * 0.91).toFixed(1)),
        upperBound: Number((projected * 1.09).toFixed(1)),
      });
    }

    res.json({
      hourlyUsage: (facet.hourly || []).map((h) => ({
        hour: `${String(h._id).padStart(2, '0')}:00`,
        avgKwh: Number(h.avgKwh.toFixed(2)),
        peakKwh: Number(h.peakKwh.toFixed(2)),
        totalKwh: Number(h.totalKwh.toFixed(1)),
      })),
      dailyUsage,
      monthlyUsage: monthlyAgg.map((m) => ({
        month: m._id,
        kwh: Number(m.totalKwh.toFixed(1)),
        cost: Number(m.totalCost.toFixed(2)),
        carbonKg: Number(m.carbonKg.toFixed(1)),
      })),
      buildingComparison: (facet.byBuilding || []).map((b) => {
        const meta = buildingMeta.get(String(b._id));
        const sqFt = meta?.totalSqFt || 250000;
        return {
          id: String(b._id),
          name: b.name,
          kwh: Number(b.totalKwh.toFixed(1)),
          cost: Number(b.totalCost.toFixed(2)),
          carbonKg: Number(b.carbonKg.toFixed(1)),
          intensityPerSqFt: Number((b.totalKwh / sqFt).toFixed(3)),
        };
      }),
      departmentComparison: (facet.byDepartment || []).map((d) => {
        const meta = deptMeta.get(String(d._id));
        const budget = meta?.monthlyBudgetUsd || 15000;
        return {
          id: String(d._id),
          name: d.name,
          kwh: Number(d.totalKwh.toFixed(1)),
          cost: Number(d.totalCost.toFixed(2)),
          budgetUsd: budget,
          utilizationPct: Number(((d.totalCost / budget) * 100).toFixed(1)),
        };
      }),
      costAnalysis: Array.from(costByTypeMap.values())
        .map((c) => ({
          category: c.category,
          kwh: Number(c.totalKwh.toFixed(1)),
          cost: Number(c.totalCost.toFixed(2)),
        }))
        .sort((a, b) => b.cost - a.cost),
      forecast,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
