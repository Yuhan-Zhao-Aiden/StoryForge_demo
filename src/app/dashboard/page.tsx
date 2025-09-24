// app/(dashboard)/page.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Icons
import { FaBook } from "react-icons/fa";
import { VscVmActive } from "react-icons/vsc";
import { FaUserGroup, FaChartLine } from "react-icons/fa6";

import StatCard from "@/components/dashboard/StatCard";
import StoryRow from "@/components/dashboard/StoryRow";

// server-side deps
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NewStoryDialog } from "./_components/NewStoryDialog";

// Types (keep Story consistent with StoryRow) 
type Story = {
  _id: string;
  title: string;
  subtitle?: string;
  status?: "Active" | "Draft" | "Published";
  lastEdited: string;
  collaborators: number;
};

// DB room doc (minimal fields we use)
type RoomDoc = {
  _id: ObjectId;
  title: string;
  subtitle?: string | null;
  collaborators?: number | null;
  visibility?: "private" | "unlisted" | "public";
  updatedAt?: Date;
};

// Helpers 
function formatDateISO(d?: Date) {
  if (!d) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function roomToStory(r: RoomDoc): Story {
  const status: Story["status"] =
    r.visibility === "public" ? "Published" :
    r.visibility === "unlisted" ? "Draft" : "Active";

  return {
    _id: String(r._id),
    title: r.title,
    subtitle: r.subtitle ?? undefined,
    status,
    lastEdited: formatDateISO(r.updatedAt),
    collaborators: r.collaborators ?? 0,
  };
}

// Data loader (server) 
async function loadData() {
  const me = await getCurrentUser();
  if (!me) throw new Error("Unauthorized");

  const db = await getDb();

  // Resolve userId (prefer id from token; fallback by email)
  let userId: ObjectId | null = null;
  if (me.id && ObjectId.isValid(me.id)) userId = new ObjectId(me.id);
  if (!userId && me.email) {
    const u = await db.collection("users").findOne<{ _id: ObjectId }>({ email: me.email }, { projection: { _id: 1 } });
    if (u?._id) userId = u._id;
  }
  if (!userId) throw new Error("User not found");

  // Owned rooms
  const ownedRooms: RoomDoc[] = await db
    .collection<RoomDoc>("rooms")
    .find({ ownerId: userId })
    .project({ title: 1, subtitle: 1, collaborators: 1, visibility: 1, updatedAt: 1 })
    .sort({ updatedAt: -1 })
    .toArray() as RoomDoc[];

  // Collaborations (exclude owner)
  const memberships = await db
    .collection("roomMembers")
    .find({ userId, role: { $ne: "owner" } })
    .project({ roomId: 1, role: 1 })
    .toArray();

  const collabIds = memberships.map((m: any) => m.roomId as ObjectId);
  let collabRooms: RoomDoc[] = [];
  if (collabIds.length) {
    collabRooms = await db
      .collection<RoomDoc>("rooms")
      .find({ _id: { $in: collabIds } })
      .project({ title: 1, subtitle: 1, collaborators: 1, visibility: 1, updatedAt: 1 })
      .toArray() as RoomDoc[];
  }

  // Build collaborating list aligned to memberships order
  const collabMap = new Map<string, RoomDoc>();
  collabRooms.forEach((r) => collabMap.set(String(r._id), r));
  const collaboratingRooms: RoomDoc[] = memberships
    .map((m: any) => collabMap.get(String(m.roomId)))
    .filter((r): r is RoomDoc => !!r);

  // If any room is missing `collaborators`, compute from roomMembers (count - 1 owner)
  const missingIds = [
    ...ownedRooms.filter((r) => r.collaborators == null).map((r) => r._id),
    ...collaboratingRooms.filter((r) => r.collaborators == null).map((r) => r._id),
  ];
  if (missingIds.length) {
    const counts = await db
      .collection("roomMembers")
      .aggregate<{ _id: ObjectId; count: number }>([
        { $match: { roomId: { $in: missingIds } } },
        { $group: { _id: "$roomId", count: { $sum: 1 } } },
      ])
      .toArray();
    const countMap = new Map<string, number>(counts.map((c) => [String(c._id), Math.max(0, c.count - 1)]));
    ownedRooms.forEach((r) => { if (r.collaborators == null) r.collaborators = countMap.get(String(r._id)) ?? 0; });
    collaboratingRooms.forEach((r) => { if (r.collaborators == null) r.collaborators = countMap.get(String(r._id)) ?? 0; });
  }

  // Normalize to Story[]
  const ownedStories: Story[] = ownedRooms.map(roomToStory);
  const collabStories: Story[] = collaboratingRooms.map(roomToStory);

  return {
    user: { username: (me as any).username ?? null, email: me.email },
    ownedStories,
    collabStories,
  };
}

// Page (server component) 
export default async function DashboardPage() {
  const { user, ownedStories, collabStories } = await loadData();
  const totalStories = ownedStories.length + collabStories.length;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      {/* Top bar (title + actions) */}
      <div className="mb-16 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold leading-tight">
            Welcome back, {user.username ?? user.email}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your stories and join collaborative sessions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary">Join Session</Button>
          {/* <Button>+ Create New Story</Button> */}
          <NewStoryDialog />
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Stories" value={totalStories} icon={<FaBook />} />
        <StatCard label="Active Sessions" value={totalStories} icon={<VscVmActive />} />
        <StatCard label="Collaborators" value={10} icon={<FaUserGroup />} />
        <StatCard label="This month" value={24} icon={<FaChartLine />} />
      </div>

      {/* Recent Stories split into Owned & Collaborating */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Owned (2/3 width) */}
        <Card className="lg:col-span-2 border-muted/60">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Stories — Your Stories</CardTitle>
            <Link
              href="#"
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {ownedStories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No owned stories yet.</p>
            ) : (
              <ul className="space-y-3">
                {ownedStories.map((s) => (
                  <StoryRow key={s._id} s={s} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Collaborating */}
        <Card className="border-muted/60">
          <CardHeader>
            <CardTitle className="text-base">Recent Stories — Collaborating</CardTitle>
          </CardHeader>
          <CardContent>
            {collabStories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No collaborations yet.</p>
            ) : (
              <ul className="space-y-3">
                {collabStories.map((s) => (
                  <StoryRow key={s._id} s={s} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
