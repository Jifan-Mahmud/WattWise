import { MongoClient, Db } from "mongodb";

const globalForMongo = globalThis as unknown as {
  _mongoClient?: MongoClient;
  _mongoClientPromise?: Promise<MongoClient>;
};

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Please define MONGODB_URI in frontend/.env");
}

function getClient(): MongoClient {
  if (!globalForMongo._mongoClient) {
    globalForMongo._mongoClient = new MongoClient(uri!, {
      maxPoolSize: 15,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
    });
  }
  return globalForMongo._mongoClient;
}

export const mongoClient = getClient();

export async function getConnectedMongoClient(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    globalForMongo._mongoClientPromise = mongoClient.connect();
  }
  return globalForMongo._mongoClientPromise;
}

export async function getWattwiseDb(): Promise<Db> {
  const connected = await getConnectedMongoClient();
  return connected.db(process.env.MONGODB_DB_NAME || "wattwise");
}
