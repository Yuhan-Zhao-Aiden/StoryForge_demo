import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";

const BYPASS = process.env.BYPASS_AUTH === "true";
const BYPASS_SECRET = process.env.BYPASS_SECRET;

async function checkAuth(req: NextRequest) {
  if (BYPASS) {
    const headerSecret = req.headers.get("x-bypass-secret");
    if (headerSecret === BYPASS_SECRET) {
      return {
        ok: true,
        user: {
          id: "dev",
          role: "admin"
        }
      }
    }
    return { ok: false, code: 401, message: "Missing bypass secret" }
  }
  return { ok: false, code: 401, message: "Auth not ready" }
}

export async function GET(req: NextRequest) {
  const auth = await checkAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.code });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const page = Number(url.searchParams.get("page") || 1);
  const perPage = Math.min(Number(url.searchParams.get("perPage") || 25), 100);

  const db = await getDb();
  const usersColl = db.collection("users");

  const filter = q ? { $or: [{ email: { $regex: q, $options: "i" } }, { name: { $regex: q, $options: "i" } }] } : {};

  const [total, users] = await Promise.all([
    usersColl.countDocuments(filter),
    usersColl
      .find(filter, { projection: { passwordHash: 0 } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .toArray(),
  ]);

  return NextResponse.json({ total, page, perPage, users });
}

// For convinence, remove in production!
export async function POST(req: NextRequest) {
  const auth = await checkAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.code });
  }

  const body = await req.json();
  if (!body.email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection("users");

  const existing = await users.findOne({ email: body.email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: "User exists" }, { status: 409 });
  }

  const now = new Date();
  const doc = {
    email: body.email.toLowerCase(),
    name: body.name || null,
    role: body.role || "user",
    createdAt: now,
    updatedAt: now
  };

  const res = await users.insertOne(doc);
  const report = {
    _id: res.insertedId,
    ...doc
  }
  return NextResponse.json({ user: report }, { status: 201});
}