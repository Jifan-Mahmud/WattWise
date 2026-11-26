import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { mongoClient } from "./mongodb";

const db = mongoClient.db(process.env.MONGODB_DB_NAME || "wattwise");

const googleClientId =
  process.env.GOOGLE_CLIENT_ID?.trim() ||
  process.env.Google_Client_ID?.trim();
const googleClientSecret =
  process.env.GOOGLE_CLIENT_SECRET?.trim() ||
  process.env.Google_Client_secret?.trim();

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client: mongoClient,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: (process.env.BETTER_AUTH_URL || "http://localhost:3000").trim(),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
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
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://localhost:3010",
  ],
});
