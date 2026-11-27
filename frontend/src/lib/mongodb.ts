import { MongoClient, Db } from "mongodb";

const globalForMongo = globalThis as unknown as {
  _mongoClient?: MongoClient;
  _mongoClientPromise?: Promise<MongoClient>;
  _mongoClosed?: boolean;
};

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Please define MONGODB_URI in frontend/.env");
}

function resetMongoCache() {
  globalForMongo._mongoClient = undefined;
  globalForMongo._mongoClientPromise = undefined;
  globalForMongo._mongoClosed = false;
}

function isTopologyClosed(client: MongoClient): boolean {
  const internal = client as unknown as {
    topology?: { isDestroyed?: () => boolean };
  };
  return Boolean(internal.topology?.isDestroyed?.());
}

function createClient(): MongoClient {
  const client = new MongoClient(uri!, {
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 10000,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000,
  });

  const handleClose = () => {
    globalForMongo._mongoClosed = true;
    if (globalForMongo._mongoClient === client) {
      resetMongoCache();
    }
  };
  client.on("topologyClosed", handleClose);
  client.on("close", handleClose);
  return client;
}

export async function getConnectedMongoClient(): Promise<MongoClient> {
  if (globalForMongo._mongoClosed) {
    resetMongoCache();
  }

  if (globalForMongo._mongoClient && globalForMongo._mongoClientPromise) {
    try {
      const existing = await globalForMongo._mongoClientPromise;
      if (!isTopologyClosed(existing)) {
        return existing;
      }
      resetMongoCache();
    } catch {
      resetMongoCache();
    }
  }

  const client = createClient();
  globalForMongo._mongoClient = client;
  globalForMongo._mongoClosed = false;
  globalForMongo._mongoClientPromise = client.connect().catch((err) => {
    if (globalForMongo._mongoClient === client) {
      resetMongoCache();
    }
    throw err;
  });

  return globalForMongo._mongoClientPromise;
}

export async function getWattwiseDb(): Promise<Db> {
  const connected = await getConnectedMongoClient();
  return connected.db(process.env.MONGODB_DB_NAME || "wattwise");
}
