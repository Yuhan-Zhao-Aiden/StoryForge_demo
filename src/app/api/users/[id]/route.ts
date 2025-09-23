import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const BYPASS = process.env.BYPASS_AUTH === "true";
const BYPASS_SECRET = process.env.BYPASS_SECRET;

async function checkAuth(req: NextRequest) {
  if (BYPASS) {
    const headerSecret = req.headers.get("x-bypass-secret");
    if (headerSecret === BYPASS_SECRET) {
      return { ok: true, user: {id: "dev", role: "admin"} };
    }
    return { ok: false, code: 401, message: "Missing bypass secret" };
  }
  return { ok: false, code: 401, message: "Auth not ready" };
}

// Get specific user by id
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await checkAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.code });

  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const db = await getDb();
  const user = await db.collection('users')
    .findOne(
      { _id: new ObjectId(id) },
      {
        projection: {
          passwordHash: 0,
        }
      }
    );

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const res = NextResponse.json({ user }, { status: 200 });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

// Update a user
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await checkAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.code });
  }

  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json();
  const db = await getDb();
  const users = db.collection("users");

  type updateObj = {
    updateAt?: Date,
    role?: string,
    name?: string,
    preferences?: Record<string, string>
  }

  const update: updateObj = { updateAt: new Date() };
  if (body.role) update.role = body.role;
  if (body.name !== undefined) update.name = body.name;
  if (body.preferences !== undefined) update.preferences = body.preferences;

  const result = await users.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: update },
    { returnDocument: "after" }
  );

  if (!result) 
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ user: result });
}

// delete a user
export async function DELETE(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
  const auth = await checkAuth(req);
  if (!auth.ok)
    return NextResponse.json({ error: auth.message }, { status: auth.code });

  const { id } = params;
  if (!ObjectId.isValid(id)) 
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");
  const r = await users.deleteOne(
    { _id: new ObjectId(id) }
  );

  if (r.deletedCount === 0)
    return NextResponse.json({ error: "Not found" }, { status: 400 });

  return NextResponse.json({ ok: true });
}