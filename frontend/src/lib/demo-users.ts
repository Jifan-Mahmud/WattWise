import { getAuth } from "./auth";
import { getWattwiseDb } from "./mongodb";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "./demo-accounts";

export { DEMO_ACCOUNTS, DEMO_PASSWORD };

let bootstrapped = false;

export async function ensureDemoAuthUsers() {
  if (bootstrapped) return;
  const auth = await getAuth();
  const db = await getWattwiseDb();

  for (const acct of DEMO_ACCOUNTS) {
    const existing = await db.collection("user").findOne({ email: acct.email });
    if (!existing) {
      try {
        await auth.api.signUpEmail({
          body: {
            email: acct.email,
            password: DEMO_PASSWORD,
            name: acct.name,
          },
        });
      } catch {
        // Ignore race condition if user was created concurrently
      }
    }
  }

  bootstrapped = true;
}
