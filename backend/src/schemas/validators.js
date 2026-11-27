const { z } = require('zod');

const ROLES = [
  'Organization Admin',
  'Facility Manager',
  'Department Manager',
  'Viewer',
];

const organizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  industry: z.string().trim().min(2).max(80).default('Commercial Real Estate'),
  timezone: z.string().trim().min(2).max(60).default('UTC'),
  currency: z.string().trim().min(3).max(6).default('USD'),
  tariffPerKwh: z.coerce.number().positive().max(10).default(0.145),
  emissionFactorKgPerKwh: z.coerce.number().positive().max(5).default(0.412),
  contactEmail: z.string().email().optional(),
});

const buildingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(24).toUpperCase(),
  address: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(80),
  totalSqFt: z.coerce.number().positive().max(10000000),
  targetMonthlyKwh: z.coerce.number().positive().max(100000000),
  status: z.enum(['Operational', 'Maintenance']).default('Operational'),
});

const floorSchema = z.object({
  buildingId: z.string().trim().min(12),
  floorNumber: z.coerce.number().int().min(-10).max(200),
  name: z.string().trim().min(2).max(120),
  areaSqFt: z.coerce.number().positive().max(2000000),
});

const departmentSchema = z.object({
  buildingId: z.string().trim().min(12),
  floorId: z.string().trim().min(12),
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().min(2).max(24).toUpperCase(),
  costCenter: z.string().trim().min(2).max(40),
  monthlyBudgetUsd: z.coerce.number().positive().max(10000000),
  headcount: z.coerce.number().int().min(1).max(50000).default(20),
});

const meterSchema = z.object({
  buildingId: z.string().trim().min(12),
  floorId: z.string().trim().min(12),
  departmentId: z.string().trim().min(12),
  meterCode: z.string().trim().min(3).max(32).toUpperCase(),
  name: z.string().trim().min(2).max(120),
  meterType: z.enum(['HVAC', 'Lighting', 'Production', 'Server Room', 'Main Feeder', 'Chiller']),
  ratedCapacityKw: z.coerce.number().positive().max(50000),
  baselineHourlyKwh: z.coerce.number().positive().max(50000),
  thresholdHourlyKwh: z.coerce.number().positive().max(50000),
  tariffPerKwh: z.coerce.number().positive().max(10).default(0.145),
  healthStatus: z.enum(['Healthy', 'Degraded', 'Offline']).default('Healthy'),
});

const energyRecordSchema = z.object({
  meterId: z.string().trim().min(12),
  consumptionKwh: z.coerce.number().min(0).max(500000),
  demandKw: z.coerce.number().min(0).max(500000).optional(),
  powerFactor: z.coerce.number().min(0.1).max(1.0).default(0.96),
  timestamp: z.coerce.date(),
});

const thresholdSchema = z.object({
  buildingId: z.string().trim().optional().nullable(),
  meterId: z.string().trim().optional().nullable(),
  name: z.string().trim().min(2).max(120),
  metric: z.enum(['hourly_kwh', 'daily_kwh', 'spike_ratio']).default('hourly_kwh'),
  limitValue: z.coerce.number().positive().max(1000000),
  spikeMultiplier: z.coerce.number().min(1.1).max(10).default(1.65),
  severity: z.enum(['High', 'Medium', 'Low']).default('High'),
  enabled: z.boolean().default(true),
});

const alertStatusSchema = z.object({
  status: z.enum(['New', 'Acknowledged', 'Resolved']),
});

const userRoleUpdateSchema = z.object({
  role: z.enum(ROLES),
  departmentIds: z.array(z.string()).default([]),
  status: z.enum(['Active', 'Suspended']).default('Active'),
  requestAction: z.enum(['approve', 'dismiss']).optional(),
});

const scheduledReportSchema = z.object({
  name: z.string().trim().min(2).max(120),
  frequency: z.enum(['Daily', 'Weekly', 'Monthly']),
  format: z.enum(['CSV', 'PDF']),
  recipients: z.array(z.string().email()).min(1),
  buildingId: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
});

module.exports = {
  ROLES,
  organizationSchema,
  buildingSchema,
  floorSchema,
  departmentSchema,
  meterSchema,
  energyRecordSchema,
  thresholdSchema,
  alertStatusSchema,
  userRoleUpdateSchema,
  scheduledReportSchema,
};
