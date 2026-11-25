const { MongoClient } = require('mongodb');
const { MONGODB_URI, DB_NAME } = require('./env');

let client = null;
let db = null;
let indexesInitialized = false;

/**
 * Connect to MongoDB using a single pooled client and initialize required indexes.
 */
async function connectDb() {
  if (db && indexesInitialized) {
    return { client, db };
  }

  if (!client) {
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
    });
    await client.connect();
  }

  db = client.db(DB_NAME);

  if (!indexesInitialized) {
    await ensureIndexes(db);
    indexesInitialized = true;
  }

  return { client, db };
}

/**
 * Return the active database handle after connection has been established.
 */
async function getDb() {
  const conn = await connectDb();
  return conn.db;
}

/**
 * Ensure all uniqueness, RBAC, and time-series aggregation indexes exist.
 */
async function ensureIndexes(database) {
  await Promise.all([
    database.collection('organizations').createIndex({ slug: 1 }, { unique: true }),
    database.collection('buildings').createIndex({ organizationId: 1, code: 1 }, { unique: true }),
    database.collection('buildings').createIndex({ organizationId: 1 }),
    database.collection('floors').createIndex({ buildingId: 1, floorNumber: 1 }, { unique: true }),
    database.collection('floors').createIndex({ organizationId: 1, buildingId: 1 }),
    database.collection('departments').createIndex({ organizationId: 1, code: 1 }, { unique: true }),
    database.collection('departments').createIndex({ organizationId: 1, buildingId: 1, floorId: 1 }),
    database.collection('meters').createIndex({ organizationId: 1, meterCode: 1 }, { unique: true }),
    database.collection('meters').createIndex({ organizationId: 1, buildingId: 1, departmentId: 1 }),
    database.collection('energy_records').createIndex({ meterId: 1, timestamp: 1 }, { unique: true }),
    database.collection('energy_records').createIndex({ organizationId: 1, timestamp: -1 }),
    database.collection('energy_records').createIndex({ organizationId: 1, buildingId: 1, timestamp: -1 }),
    database.collection('energy_records').createIndex({ organizationId: 1, departmentId: 1, timestamp: -1 }),
    database.collection('energy_records').createIndex({ organizationId: 1, isAnomaly: 1, timestamp: -1 }),
    database.collection('alert_thresholds').createIndex({ organizationId: 1, enabled: 1 }),
    database.collection('alerts').createIndex({ organizationId: 1, status: 1, triggeredAt: -1 }),
    database.collection('alerts').createIndex({ organizationId: 1, buildingId: 1, triggeredAt: -1 }),
    database.collection('wattwise_profiles').createIndex({ email: 1 }, { unique: true }),
    database.collection('wattwise_profiles').createIndex({ organizationId: 1, role: 1 }),
    database.collection('energy_recommendations').createIndex({ organizationId: 1, status: 1 }),
    database.collection('scheduled_reports').createIndex({ organizationId: 1, enabled: 1 }),
  ]);
}

async function closeDb() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    indexesInitialized = false;
  }
}

module.exports = {
  connectDb,
  getDb,
  ensureIndexes,
  closeDb,
};
