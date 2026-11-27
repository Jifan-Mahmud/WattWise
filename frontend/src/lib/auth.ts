import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import type { Db, MongoClient } from "mongodb";
import { getConnectedMongoClient } from "./mongodb";

const googleClientId =
  process.env.GOOGLE_CLIENT_ID?.trim() ||
  process.env.Google_Client_ID?.trim();
const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET?.trim() ||
  process.env.Google_Client_secret?.trim();

const vercelProdUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`
  : undefined;
const vercelPreviewUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL.trim()}`
  : undefined;

const baseUrl = (
  process.env.BETTER_AUTH_URL?.trim() ||
  vercelProdUrl ||
  vercelPreviewUrl ||
  "http://localhost:3000"
).replace(/\/+$/, "");

const trustedOrigins = Array.from(
  new Set(
    [
      baseUrl,
      vercelProdUrl,
      vercelPreviewUrl,
      "https://wattwise-frontend*.vercel.app",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://localhost:3010",
    ].filter((v): v is string => Boolean(v))
  )
);

function createBetterAuth(db: Db, client: MongoClient) {
  return betterAuth({
    database: mongodbAdapter(db, {
      client,
    }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: baseUrl,
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 8,
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
        requireLocalEmailVerified: false,
      },
    },
    ...(googleClientId && googleClientSecret
      ? {
          socialProviders: {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          },
        }
      : {}),
    trustedOrigins,
  });
}

type AuthInstance = ReturnType<typeof createBetterAuth>;

const globalForAuth = globalThis as unknown as {
  _betterAuthClient?: MongoClient;
  _betterAuthInstance?: AuthInstance;
  _betterAuthInitPromise?: Promise<AuthInstance>;
};

/**
 * Return a Better Auth instance bound to an active, healthy MongoClient.
 * Re-creates the adapter cleanly if Vercel serverless froze and closed a prior topology.
 */
export async function getAuth(): Promise<AuthInstance> {
  const client = await getConnectedMongoClient();

  if (
    globalForAuth._betterAuthInstance &&
    globalForAuth._betterAuthClient === client
  ) {
    return globalForAuth._betterAuthInstance;
  }

  if (!globalForAuth._betterAuthInitPromise) {
    globalForAuth._betterAuthInitPromise = (async () => {
      const db = client.db(process.env.MONGODB_DB_NAME || "wattwise");
      const instance = createBetterAuth(db, client);
      globalForAuth._betterAuthClient = client;
      globalForAuth._betterAuthInstance = instance;
      return instance;
    })().finally(() => {
      globalForAuth._betterAuthInitPromise = undefined;
    });
  }

  return globalForAuth._betterAuthInitPromise;
}
