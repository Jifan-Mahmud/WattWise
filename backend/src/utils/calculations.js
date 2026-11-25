const { ObjectId } = require('mongodb');

const DEFAULT_TARIFF_PER_KWH = 0.145;
const DEFAULT_EMISSION_FACTOR_KG = 0.412;

/**
 * Safely convert a string or ObjectId into a valid MongoDB ObjectId.
 */
function toObjectId(value, fieldName = 'id') {
  if (value instanceof ObjectId) return value;
  if (typeof value === 'string' && ObjectId.isValid(value)) {
    return new ObjectId(value);
  }
  const err = new Error(`Invalid ${fieldName}`);
  err.status = 400;
  throw err;
}

/**
 * Compute consistent electricity cost and carbon emissions from kWh usage.
 */
function computeEnergyMetrics(consumptionKwh, tariffPerKwh = DEFAULT_TARIFF_PER_KWH, emissionFactor = DEFAULT_EMISSION_FACTOR_KG) {
  const kwh = Math.max(0, Number(consumptionKwh) || 0);
  const tariff = Math.max(0, Number(tariffPerKwh) || DEFAULT_TARIFF_PER_KWH);
  const factor = Math.max(0, Number(emissionFactor) || DEFAULT_EMISSION_FACTOR_KG);

  return {
    consumptionKwh: Number(kwh.toFixed(2)),
    estimatedCost: Number((kwh * tariff).toFixed(2)),
    carbonKg: Number((kwh * factor).toFixed(2)),
  };
}

/**
 * Escape CSV cell safely, neutralizing formula injection and embedded commas/quotes.
 */
function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a regex-safe partial search filter string.
 */
function escapeRegex(input) {
  return String(input || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  DEFAULT_TARIFF_PER_KWH,
  DEFAULT_EMISSION_FACTOR_KG,
  toObjectId,
  computeEnergyMetrics,
  escapeCsvCell,
  escapeRegex,
};
