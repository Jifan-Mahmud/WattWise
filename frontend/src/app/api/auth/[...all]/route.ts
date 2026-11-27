import { getAuth } from "@/lib/auth";

async function handleAuthRequest(req: Request) {
  const auth = await getAuth();
  return auth.handler(req);
}

export async function GET(req: Request) {
  return handleAuthRequest(req);
}

export async function POST(req: Request) {
  return handleAuthRequest(req);
}
